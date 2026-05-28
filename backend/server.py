from pathlib import Path
from dotenv import load_dotenv

# Carrega o arquivo .env garantindo o caminho correto
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt
import certifi  # <-- ADICIONADO: Importante para evitar o erro de SSL no Render
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal

# MongoDB---
mongo_url = os.environ['MONGO_URL']
# AJUSTE: Adicionado tlsCAFile para garantir o handshake SSL/TLS no ambiente Linux do Render
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ['DB_NAME']]

# Apenas UMA instância do app e do router aqui no topo
app = FastAPI(title="Caixa de Mercado API")
api_router = APIRouter(prefix="/api")

logger = logging.getLogger("api")
logging.basicConfig(level=logging.INFO)

# =========================
# AUTH HELPERS
# =========================
JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador")
    return user


# Auxiliar para limpar o ObjectId do MongoDB antes de enviar ao FastAPI
def mongo_to_dict(obj):
    if not obj:
        return obj
    if "_id" in obj:
        del obj["_id"]
    return obj


# =========================
# MODELS
# =========================
class LoginInput(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str

class CategoryIn(BaseModel):
    name: str
    description: Optional[str] = ""

class Category(CategoryIn):
    id: str

class SupplierIn(BaseModel):
    name: str
    contact: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""

class Supplier(SupplierIn):
    id: str

class ProductIn(BaseModel):
    barcode: str
    name: str
    description: Optional[str] = ""
    price: float
    cost: float = 0
    stock: float = 0
    min_stock: float = 0
    unit: str = "un"
    category_id: Optional[str] = None
    supplier_id: Optional[str] = None
    image_url: Optional[str] = ""

class Product(ProductIn):
    id: str
    created_at: str

class SaleItemIn(BaseModel):
    product_id: str
    quantity: float
    unit_price: float

class SaleIn(BaseModel):
    items: List[SaleItemIn]
    payment_method: Literal["dinheiro", "cartao_debito", "cartao_credito", "pix"]
    amount_paid: float
    discount: float = 0
    customer_name: Optional[str] = ""

class Sale(BaseModel):
    id: str
    items: List[dict]
    subtotal: float
    discount: float
    total: float
    payment_method: str
    amount_paid: float
    change: float
    customer_name: str
    operator_id: str
    operator_name: str
    created_at: str
    caixa_numero: Optional[int] = None 
    cash_session_id: Optional[str] = None

class StockMovementIn(BaseModel):
    product_id: str
    type: Literal["entrada", "saida", "ajuste"]
    quantity: float
    reason: Optional[str] = ""

class StockMovement(StockMovementIn):
    id: str
    product_name: str
    stock_before: float
    stock_after: float
    operator_id: str
    operator_name: str
    created_at: str

# NOVOS MODELOS PARA MULTI-CAIXA
class CashSessionOpen(BaseModel):
    caixa_numero: int
    initial_balance: float = Field(..., ge=0)

class CashSessionClose(BaseModel):
    final_balance_reported: float


# =========================
# AUTH ROUTES
# =========================
@api_router.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    token = create_access_token(user["id"], user["email"], user["role"])
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="lax", max_age=12 * 3600, path="/",
    )
    return {
        "id": user["id"], "email": user["email"],
        "name": user["name"], "role": user["role"], "token": token,
    }

@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return user


# =========================
# CATEGORY CRUD
# =========================
@api_router.get("/categories", response_model=List[Category])
async def list_categories(user: dict = Depends(get_current_user)):
    docs = await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return docs

@api_router.post("/categories", response_model=Category)
async def create_category(payload: CategoryIn, user: dict = Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **payload.model_dump()}
    await db.categories.insert_one(doc.copy())
    return doc

@api_router.put("/categories/{cat_id}", response_model=Category)
async def update_category(cat_id: str, payload: CategoryIn, user: dict = Depends(require_admin)):
    await db.categories.update_one({"id": cat_id}, {"$set": payload.model_dump()})
    doc = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Categoria não encontrada")
    return doc

@api_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, user: dict = Depends(require_admin)):
    await db.categories.delete_one({"id": cat_id})
    return {"ok": True}


# =========================
# SUPPLIER CRUD
# =========================
@api_router.get("/suppliers", response_model=List[Supplier])
async def list_suppliers(user: dict = Depends(get_current_user)):
    docs = await db.suppliers.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return docs

@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(payload: SupplierIn, user: dict = Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **payload.model_dump()}
    await db.suppliers.insert_one(doc.copy())
    return doc

@api_router.put("/suppliers/{sid}", response_model=Supplier)
async def update_supplier(sid: str, payload: SupplierIn, user: dict = Depends(require_admin)):
    await db.suppliers.update_one({"id": sid}, {"$set": payload.model_dump()})
    doc = await db.suppliers.find_one({"id": sid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Fornecedor não encontrado")
    return doc

@api_router.delete("/suppliers/{sid}")
async def delete_supplier(sid: str, user: dict = Depends(require_admin)):
    await db.suppliers.delete_one({"id": sid})
    return {"ok": True}


# =========================
# PRODUCT CRUD
# =========================
@api_router.get("/products", response_model=List[Product])
async def list_products(
    user: dict = Depends(get_current_user),
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    low_stock: Optional[bool] = False,
):
    query: dict = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}},
        ]
    if category_id:
        query["category_id"] = category_id
    docs = await db.products.find(query, {"_id": 0}).sort("name", 1).to_list(2000)
    if low_stock:
        docs = [d for d in docs if d.get("stock", 0) <= d.get("min_stock", 0)]
    return docs

@api_router.get("/products/barcode/{barcode}", response_model=Product)
async def get_product_by_barcode(barcode: str, user: dict = Depends(get_current_user)):
    doc = await db.products.find_one({"barcode": barcode}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Produto não encontrado")
    return doc

@api_router.post("/products", response_model=Product)
async def create_product(payload: ProductIn, user: dict = Depends(require_admin)):
    exists = await db.products.find_one({"barcode": payload.barcode})
    if exists:
        raise HTTPException(400, "Código de barras já cadastrado")
    doc = {
        "id": str(uuid.uuid4()),
        **payload.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.products.insert_one(doc.copy())
    return doc

@api_router.put("/products/{pid}", response_model=Product)
async def update_product(pid: str, payload: ProductIn, user: dict = Depends(require_admin)):
    await db.products.update_one({"id": pid}, {"$set": payload.model_dump()})
    doc = await db.products.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Produto não encontrado")
    return doc

@api_router.delete("/products/{pid}")
async def delete_product(pid: str, user: dict = Depends(require_admin)):
    await db.products.delete_one({"id": pid})
    return {"ok": True}


# =========================
# STOCK MOVEMENTS
# =========================
@api_router.get("/stock/movements", response_model=List[StockMovement])
async def list_movements(user: dict = Depends(get_current_user), limit: int = 200):
    docs = await db.stock_movements.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return docs

@api_router.post("/stock/movements", response_model=StockMovement)
async def create_movement(payload: StockMovementIn, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": payload.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Produto não encontrado")
    stock_before = float(product.get("stock", 0))
    if payload.type == "entrada":
        stock_after = stock_before + payload.quantity
    elif payload.type == "saida":
        stock_after = stock_before - payload.quantity
        if stock_after < 0:
            raise HTTPException(400, "Estoque insuficiente")
    else:  # ajuste -> quantidade absoluta
        stock_after = payload.quantity
    await db.products.update_one({"id": payload.product_id}, {"$set": {"stock": stock_after}})
    doc = {
        "id": str(uuid.uuid4()),
        **payload.model_dump(),
        "product_name": product["name"],
        "stock_before": stock_before,
        "stock_after": stock_after,
        "operator_id": user["id"],
        "operator_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.stock_movements.insert_one(doc.copy())
    return doc


# =========================
# CONTROLE DE CAIXA (SESSÕES)
# =========================
@api_router.get("/cash/status")
async def get_cash_status(user: dict = Depends(get_current_user)):
    """Verifica se o operador logado possui um caixa ativo aberto"""
    session = await db.cash_sessions.find_one({"operator_id": user["id"], "status": "aberto"})
    if not session:
        return {"active": False, "session": None}
    return {"active": True, "session": mongo_to_dict(session)}

@api_router.post("/cash/open")
async def open_cash_session(payload: CashSessionOpen, user: dict = Depends(get_current_user)):
    # Verifica se o operador já tem um caixa aberto
    already_open = await db.cash_sessions.find_one({"operator_id": user["id"], "status": "aberto"})
    if already_open:
        raise HTTPException(status_code=400, detail=f"Você já possui o Caixa {already_open['caixa_numero']} aberto!")

    # Verifica se o número do caixa está em uso por outra pessoa
    caixa_busy = await db.cash_sessions.find_one({"caixa_numero": payload.caixa_numero, "status": "aberto"})
    if caixa_busy:
        raise HTTPException(status_code=400, detail=f"O Caixa {payload.caixa_numero} já está aberto por {caixa_busy['operator_name']}.")

    session_doc = {
        "id": str(uuid.uuid4()),
        "caixa_numero": payload.caixa_numero,
        "operator_id": user["id"],
        "operator_name": user["name"],
        "status": "aberto",
        "opened_at": datetime.now(timezone.utc).isoformat(),
        "closed_at": None,
        "initial_balance": payload.initial_balance,
        "total_dinheiro": 0.0,
        "total_cartao_debito": 0.0,
        "total_cartao_credito": 0.0,
        "total_pix": 0.0,
        "final_balance_reported": 0.0
    }
    await db.cash_sessions.insert_one(session_doc)
    return mongo_to_dict(session_doc)

@api_router.post("/cash/close")
async def close_cash_session(payload: CashSessionClose, user: dict = Depends(get_current_user)):
    session = await db.cash_sessions.find_one({"operator_id": user["id"], "status": "aberto"})
    if not session:
        raise HTTPException(status_code=400, detail="Você não possui nenhuma sessão de caixa aberta para fechar.")

    closed_at = datetime.now(timezone.utc).isoformat()
    
    # Atualiza o caixa fechando o turno
    await db.cash_sessions.update_one(
        {"id": session["id"]},
        {"$set": {
            "status": "fechado",
            "closed_at": closed_at,
            "final_balance_reported": payload.final_balance_reported
        }}
    )
    
    updated_session = await db.cash_sessions.find_one({"id": session["id"]})
    return {"detail": "Caixa fechado com sucesso!", "summary": mongo_to_dict(updated_session)}


# =========================
# SALES (INTEGRADO COM CAIXA)
# =========================
@api_router.post("/sales", response_model=Sale)
async def create_sale(payload: SaleIn, user: dict = Depends(get_current_user)):
    if not payload.items:
        raise HTTPException(400, "Venda sem itens não é permitida")

    # OBRIGA O CAIXA A ESTAR ABERTO PARA FAZER VENDA
    session = await db.cash_sessions.find_one({"operator_id": user["id"], "status": "aberto"})
    if not session:
        raise HTTPException(status_code=400, detail="Bloqueado: Você precisa ABRIR O CAIXA antes de registrar vendas.")

    # validate stock
    enriched_items = []
    subtotal = 0.0
    for item in payload.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(404, f"Produto {item.product_id} não encontrado")
        if float(product.get("stock", 0)) < item.quantity:
            raise HTTPException(400, f"Estoque insuficiente para {product['name']}")
        line_total = round(item.unit_price * item.quantity, 2)
        subtotal += line_total
        enriched_items.append({
            "product_id": item.product_id,
            "product_name": product["name"],
            "barcode": product.get("barcode", ""),
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total": line_total,
        })
    subtotal = round(subtotal, 2)
    total = round(subtotal - payload.discount, 2)
    if total < 0:
        raise HTTPException(400, "Desconto maior que o subtotal")
    if payload.payment_method == "dinheiro" and payload.amount_paid < total:
        raise HTTPException(400, "Valor pago insuficiente para pagamento em dinheiro")
    change = round(max(0, payload.amount_paid - total), 2)

    sale_doc = {
        "id": str(uuid.uuid4()),
        "items": enriched_items,
        "subtotal": subtotal,
        "discount": payload.discount,
        "total": total,
        "payment_method": payload.payment_method,
        "amount_paid": payload.amount_paid,
        "change": change,
        "customer_name": payload.customer_name or "",
        "operator_id": user["id"],
        "operator_name": user["name"],
        "caixa_numero": session["caixa_numero"],  
        "cash_session_id": session["id"],       
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sales.insert_one(sale_doc.copy())

    # INCREMENTA O VALOR VENDIDO NA GAVETA CORRETA DO CAIXA
    campo_update = f"total_{payload.payment_method}"
    await db.cash_sessions.update_one(
        {"id": session["id"]},
        {"$inc": {campo_update: total}}
    )

    # decrement stock + create movements
    for item in enriched_items:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        stock_before = float(product.get("stock", 0))
        stock_after = stock_before - item["quantity"]
        await db.products.update_one(
            {"id": item["product_id"]}, {"$set": {"stock": stock_after}}
        )
        mov = {
            "id": str(uuid.uuid4()),
            "product_id": item["product_id"],
            "product_name": item["product_name"],
            "type": "saida",
            "quantity": item["quantity"],
            "reason": f"Venda #{sale_doc['id'][:8]}",
            "stock_before": stock_before,
            "stock_after": stock_after,
            "operator_id": user["id"],
            "operator_name": user["name"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.stock_movements.insert_one(mov)
    return mongo_to_dict(sale_doc)


@api_router.get("/sales", response_model=List[Sale])
async def list_sales(user: dict = Depends(get_current_user), limit: int = 200):
    docs = await db.sales.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return docs

@api_router.get("/sales/{sid}", response_model=Sale)
async def get_sale(sid: str, user: dict = Depends(get_current_user)):
    doc = await db.sales.find_one({"id": sid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Venda não encontrada")
    return doc


# RELATÓRIO DO HISTÓRICO FINANCEIRO DE SESSÕES DE UM CAIXA ESPECÍFICO
@api_router.get("/reports/cash/{caixa_numero}")
async def get_cash_report(caixa_numero: int, user: dict = Depends(require_admin)):
    docs = await db.cash_sessions.find({"caixa_numero": caixa_numero}).sort("opened_at", -1).to_list(100)
    return [mongo_to_dict(d) for d in docs]


# =========================
# REPORTS
# =========================
@api_router.get("/reports/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    last_7d = (datetime.now(timezone.utc) - timedelta(days=7))

    sales = await db.sales.find({}, {"_id": 0}).to_list(5000)
    products = await db.products.find({}, {"_id": 0}).to_list(5000)

    today_sales = [s for s in sales if datetime.fromisoformat(s["created_at"]) >= today_start]
    week_sales = [s for s in sales if datetime.fromisoformat(s["created_at"]) >= last_7d]
    today_revenue = round(sum(s["total"] for s in today_sales), 2)
    today_count = len(today_sales)
    avg_ticket = round(today_revenue / today_count, 2) if today_count else 0
    total_products = len(products)
    low_stock_count = sum(1 for p in products if p.get("stock", 0) <= p.get("min_stock", 0))

    # last 7 days bucketed
    by_day = {}
    for s in week_sales:
        d = datetime.fromisoformat(s["created_at"]).date().isoformat()
        by_day[d] = by_day.get(d, 0) + s["total"]
    series = []
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).date().isoformat()
        series.append({"date": d, "total": round(by_day.get(d, 0), 2)})

    # payment methods
    pay_totals = {}
    for s in today_sales:
        pay_totals[s["payment_method"]] = pay_totals.get(s["payment_method"], 0) + s["total"]
    pay_series = [{"method": k, "total": round(v, 2)} for k, v in pay_totals.items()]

    # top products last 7d
    top = {}
    for s in week_sales:
        for it in s["items"]:
            top[it["product_name"]] = top.get(it["product_name"], 0) + it["quantity"]
    top_products = sorted(
            [{"name": k, "qty": v} for k, v in top.items()],
            key=lambda x: x["qty"], reverse=True
        )[:5]

    return {
        "today_revenue": today_revenue,
        "today_count": today_count,
        "avg_ticket": avg_ticket,
        "total_products": total_products,
        "low_stock_count": low_stock_count,
        "series_7d": series,
        "payment_methods_today": pay_series,
        "top_products_7d": top_products,
    }


# =========================
# STARTUP: seed admin + indexes
# =========================
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("barcode", unique=True)
    await db.sales.create_index("created_at")
    await db.stock_movements.create_index("created_at")
    await db.cash_sessions.create_index("opened_at") 

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@mercado.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Administrador",
            "role": "admin",
            "password_hash": hash_password(admin_password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated: {admin_email}")

    # seed operator
    op_email = "operador@mercado.com"
    if not await db.users.find_one({"email": op_email}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": op_email,
            "name": "Operador 01",
            "role": "operator",
            "password_hash": hash_password("operador123"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

# AJUSTE: Adicionado o link do Netlify nas origens permitidas do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://caixamercado.netlify.app/", # Link do Netlify
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.10.7:5173"
    ],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


if __name__ == "__main__":
    import uvicorn
    # AJUSTE: O Render gerencia a porta dinamicamente pela variável de ambiente PORT
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)

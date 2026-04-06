from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import string
import httpx
import jwt
import bcrypt
import json
import io
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'cha-de-panela-secret-key-2025-william-mallu')
JWT_ALGORITHM = "HS256"

# Admin credentials (hardcoded as per requirement)
ADMIN_USERNAME = "William"
ADMIN_PASSWORD = "25062001wjm"

# Webhook URLs
WEBHOOK_RSVP = "https://n8n.andrewmendes.com.br/webhook/convitewilliam"
WEBHOOK_GIFT = "https://n8n.andrewmendes.com.br/webhook/presenteescolhido"

# Create the main app
app = FastAPI(title="Chá de Panela API")
# Cole isso logo abaixo do app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://williamemallu.copyetech.shop", # EXATAMENTE ASSIM, SEM BARRA NO FINAL
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

def generate_slug(length=6):
    """Generate a random URL-safe slug"""
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))

# Guest Models
class GuestBase(BaseModel):
    name: str
    guest_type: str = Field(description="'individual' or 'couple'")

class GuestCreate(GuestBase):
    pass

class GuestUpdate(BaseModel):
    name: Optional[str] = None
    guest_type: Optional[str] = None

class Guest(GuestBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    slug: str
    created_at: datetime
    view_count: int = 0

class GuestWithRSVP(Guest):
    rsvp: Optional[dict] = None
    view_count: int = 0
    last_viewed: Optional[str] = None

# RSVP Models
class Companion(BaseModel):
    name: str
    is_child: bool = False

class RSVPCreate(BaseModel):
    guest_slug: str
    name: str
    whatsapp: str
    companions: List[Companion] = []

class RSVP(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    guest_id: str
    guest_slug: str
    name: str
    whatsapp: str
    companions: List[Companion]
    created_at: datetime

# Gift Models
class GiftBase(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    external_link: Optional[str] = None
    coupon_code: Optional[str] = None
    is_local: bool = False
    is_fixed_store: bool = False
    store_map_link: Optional[str] = None

class GiftCreate(GiftBase):
    pass

class GiftUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    external_link: Optional[str] = None
    coupon_code: Optional[str] = None
    is_local: Optional[bool] = None
    is_fixed_store: Optional[bool] = None
    store_map_link: Optional[str] = None

class Gift(GiftBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    reserved_by_guest_id: Optional[str] = None
    reserved_by_guest_name: Optional[str] = None
    reserved_at: Optional[datetime] = None
    created_at: datetime
    is_fixed_store: bool = False
    store_map_link: Optional[str] = None

# Auth Models
class AdminLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Dashboard Models
class DashboardStats(BaseModel):
    total_guests: int
    total_confirmed: int
    total_adults: int
    total_children: int
    total_gifts: int
    reserved_gifts: int
    reserved_gifts_list: List[dict]
    guests_not_viewed: int
    total_views: int

# View Log Model
class ViewLog(BaseModel):
    guest_id: str
    guest_slug: str
    viewed_at: datetime
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None

# ===================== AUTH HELPERS =====================

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_admin(request: Request) -> str:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ===================== WEBHOOK HELPER =====================

async def send_webhook(url: str, data: dict):
    """Send webhook POST request"""
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(url, json=data, timeout=10.0)
            logger.info(f"Webhook sent to {url}: {response.status_code}")
    except Exception as e:
        logger.error(f"Webhook error: {e}")

# ===================== AUTH ENDPOINTS =====================

@api_router.post("/auth/login", response_model=TokenResponse)
async def admin_login(credentials: AdminLogin, response: Response):
    """Admin login with hardcoded credentials"""
    if credentials.username != ADMIN_USERNAME or credentials.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    access_token = create_access_token(credentials.username)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=86400,
        path="/"
    )
    return TokenResponse(access_token=access_token)

@api_router.post("/auth/logout")
async def admin_logout(response: Response):
    """Admin logout"""
    response.delete_cookie("access_token", path="/")
    return {"message": "Logout realizado com sucesso"}

@api_router.get("/auth/me")
async def get_current_user(username: str = Depends(get_current_admin)):
    """Get current authenticated admin"""
    return {"username": username}

# ===================== GUEST ENDPOINTS =====================

@api_router.post("/guests", response_model=Guest)
async def create_guest(guest: GuestCreate, _: str = Depends(get_current_admin)):
    """Create a new guest"""
    # Generate unique slug
    while True:
        slug = generate_slug()
        existing = await db.guests.find_one({"slug": slug})
        if not existing:
            break
    
    guest_doc = {
        "name": guest.name,
        "guest_type": guest.guest_type.lower(),
        "slug": slug,
        "view_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.guests.insert_one(guest_doc)
    guest_doc["id"] = str(result.inserted_id)
    guest_doc["created_at"] = datetime.fromisoformat(guest_doc["created_at"])
    
    return Guest(**guest_doc)

@api_router.get("/guests", response_model=List[GuestWithRSVP])
async def list_guests(_: str = Depends(get_current_admin)):
    """List all guests with their RSVP status and view count"""
    guests = await db.guests.find({}).to_list(1000)
    result = []
    
    for g in guests:
        rsvp = await db.rsvps.find_one({"guest_id": str(g["_id"])}, {"_id": 0})
        
        # Get last view
        last_view = await db.view_logs.find_one(
            {"guest_id": str(g["_id"])},
            sort=[("viewed_at", -1)]
        )
        
        guest_data = {
            "id": str(g["_id"]),
            "name": g["name"],
            "guest_type": g["guest_type"],
            "slug": g["slug"],
            "view_count": g.get("view_count", 0),
            "created_at": datetime.fromisoformat(g["created_at"]) if isinstance(g["created_at"], str) else g["created_at"],
            "rsvp": rsvp,
            "last_viewed": last_view["viewed_at"] if last_view else None
        }
        result.append(GuestWithRSVP(**guest_data))
    
    return result

@api_router.get("/guests/{guest_id}", response_model=Guest)
async def get_guest(guest_id: str, _: str = Depends(get_current_admin)):
    """Get a specific guest"""
    guest = await db.guests.find_one({"_id": ObjectId(guest_id)})
    if not guest:
        raise HTTPException(status_code=404, detail="Convidado não encontrado")
    
    return Guest(
        id=str(guest["_id"]),
        name=guest["name"],
        guest_type=guest["guest_type"],
        slug=guest["slug"],
        view_count=guest.get("view_count", 0),
        created_at=datetime.fromisoformat(guest["created_at"]) if isinstance(guest["created_at"], str) else guest["created_at"]
    )

@api_router.get("/guests/{guest_id}/views")
async def get_guest_views(guest_id: str, _: str = Depends(get_current_admin)):
    """Get view history for a guest"""
    views = await db.view_logs.find(
        {"guest_id": guest_id},
        {"_id": 0}
    ).sort("viewed_at", -1).to_list(100)
    
    return {"views": views, "total": len(views)}

@api_router.put("/guests/{guest_id}", response_model=Guest)
async def update_guest(guest_id: str, guest_update: GuestUpdate, _: str = Depends(get_current_admin)):
    """Update a guest"""
    update_data = {k: v for k, v in guest_update.model_dump().items() if v is not None}
    if "guest_type" in update_data:
        update_data["guest_type"] = update_data["guest_type"].lower()
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")
    
    result = await db.guests.find_one_and_update(
        {"_id": ObjectId(guest_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Convidado não encontrado")
    
    return Guest(
        id=str(result["_id"]),
        name=result["name"],
        guest_type=result["guest_type"],
        slug=result["slug"],
        view_count=result.get("view_count", 0),
        created_at=datetime.fromisoformat(result["created_at"]) if isinstance(result["created_at"], str) else result["created_at"]
    )

@api_router.delete("/guests/{guest_id}")
async def delete_guest(guest_id: str, _: str = Depends(get_current_admin)):
    """Delete a guest"""
    result = await db.guests.delete_one({"_id": ObjectId(guest_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Convidado não encontrado")
    
    # Also delete associated RSVP and view logs
    await db.rsvps.delete_many({"guest_id": guest_id})
    await db.view_logs.delete_many({"guest_id": guest_id})
    
    # Release any gifts reserved by this guest
    await db.gifts.update_many(
        {"reserved_by_guest_id": guest_id},
        {"$set": {"reserved_by_guest_id": None, "reserved_by_guest_name": None, "reserved_at": None}}
    )
    
    return {"message": "Convidado removido com sucesso"}

# ===================== PUBLIC GUEST ENDPOINT =====================

@api_router.get("/invite/{slug}")
async def get_invite_by_slug(slug: str, request: Request):
    """Get guest info by slug (public endpoint for invitation page)"""
    guest = await db.guests.find_one({"slug": slug})
    if not guest:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    
    guest_id = str(guest["_id"])
    
    # Log the view
    view_log = {
        "guest_id": guest_id,
        "guest_slug": slug,
        "viewed_at": datetime.now(timezone.utc).isoformat(),
        "user_agent": request.headers.get("user-agent", ""),
        "ip_address": request.client.host if request.client else ""
    }
    await db.view_logs.insert_one(view_log)
    
    # Increment view count
    await db.guests.update_one(
        {"_id": guest["_id"]},
        {"$inc": {"view_count": 1}}
    )
    
    # Check if already confirmed
    rsvp = await db.rsvps.find_one({"guest_slug": slug}, {"_id": 0})
    
    # Get gifts reserved by this guest
    reserved_gifts = await db.gifts.find(
        {"reserved_by_guest_id": guest_id},
        {"_id": 0, "reserved_by_guest_id": 0, "reserved_by_guest_name": 0}
    ).to_list(100)
    
    for gift in reserved_gifts:
        gift["id"] = gift.get("id", "")
    
    return {
        "id": guest_id,
        "name": guest["name"],
        "guest_type": guest["guest_type"],
        "slug": slug,
        "rsvp": rsvp,
        "reserved_gifts": reserved_gifts
    }

# ===================== RSVP ENDPOINTS =====================

@api_router.post("/rsvp", response_model=RSVP)
async def create_rsvp(rsvp_data: RSVPCreate):
    """Create or update RSVP confirmation"""
    # Check deadline (19/06 at 13h BRT = 16h UTC)
    deadline = datetime(2026, 6, 19, 16, 0, 0, tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > deadline:
        raise HTTPException(status_code=400, detail="O prazo para confirmação expirou")
    
    # Find guest by slug
    guest = await db.guests.find_one({"slug": rsvp_data.guest_slug})
    if not guest:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    
    guest_id = str(guest["_id"])
    
    # Check if already confirmed
    existing_rsvp = await db.rsvps.find_one({"guest_id": guest_id})
    if existing_rsvp:
        raise HTTPException(status_code=400, detail="Você já confirmou presença")
    
    rsvp_doc = {
        "guest_id": guest_id,
        "guest_slug": rsvp_data.guest_slug,
        "name": rsvp_data.name,
        "whatsapp": rsvp_data.whatsapp,
        "companions": [c.model_dump() for c in rsvp_data.companions],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.rsvps.insert_one(rsvp_doc)
    rsvp_doc["id"] = str(result.inserted_id)
    rsvp_doc["created_at"] = datetime.fromisoformat(rsvp_doc["created_at"])
    
    # Send webhook
    webhook_data = {
        "guest_name": guest["name"],
        "rsvp_name": rsvp_data.name,
        "whatsapp": rsvp_data.whatsapp,
        "companions": rsvp_doc["companions"],
        "total_adults": 1 + sum(1 for c in rsvp_data.companions if not c.is_child),
        "total_children": sum(1 for c in rsvp_data.companions if c.is_child)
    }
    await send_webhook(WEBHOOK_RSVP, webhook_data)
    
    return RSVP(**rsvp_doc)

@api_router.get("/rsvps", response_model=List[RSVP])
async def list_rsvps(_: str = Depends(get_current_admin)):
    """List all RSVPs (admin only)"""
    rsvps = await db.rsvps.find({}).to_list(1000)
    result = []
    for r in rsvps:
        r["id"] = str(r["_id"])
        r["created_at"] = datetime.fromisoformat(r["created_at"]) if isinstance(r["created_at"], str) else r["created_at"]
        del r["_id"]
        result.append(RSVP(**r))
    return result

# ===================== GIFT ENDPOINTS =====================

@api_router.post("/gifts", response_model=Gift)
async def create_gift(gift: GiftCreate, _: str = Depends(get_current_admin)):
    """Create a new gift"""
    gift_doc = gift.model_dump()
    gift_doc["reserved_by_guest_id"] = None
    gift_doc["reserved_by_guest_name"] = None
    gift_doc["reserved_at"] = None
    gift_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.gifts.insert_one(gift_doc)
    gift_doc["id"] = str(result.inserted_id)
    gift_doc["created_at"] = datetime.fromisoformat(gift_doc["created_at"])
    
    return Gift(**gift_doc)

@api_router.get("/gifts", response_model=List[Gift])
async def list_gifts():
    """List all gifts (public endpoint)"""
    # Fixed store card should come first
    gifts = await db.gifts.find({}).sort([("is_fixed_store", -1), ("created_at", 1)]).to_list(1000)
    result = []
    for g in gifts:
        g["id"] = str(g["_id"])
        g["created_at"] = datetime.fromisoformat(g["created_at"]) if isinstance(g["created_at"], str) else g["created_at"]
        if g.get("reserved_at") and isinstance(g["reserved_at"], str):
            g["reserved_at"] = datetime.fromisoformat(g["reserved_at"])
        del g["_id"]
        result.append(Gift(**g))
    return result

@api_router.get("/gifts/admin", response_model=List[Gift])
async def list_gifts_admin(_: str = Depends(get_current_admin)):
    """List all gifts with full info (admin only)"""
    gifts = await db.gifts.find({}).sort([("is_fixed_store", -1), ("created_at", 1)]).to_list(1000)
    result = []
    for g in gifts:
        g["id"] = str(g["_id"])
        g["created_at"] = datetime.fromisoformat(g["created_at"]) if isinstance(g["created_at"], str) else g["created_at"]
        if g.get("reserved_at") and isinstance(g["reserved_at"], str):
            g["reserved_at"] = datetime.fromisoformat(g["reserved_at"])
        del g["_id"]
        result.append(Gift(**g))
    return result

@api_router.put("/gifts/{gift_id}", response_model=Gift)
async def update_gift(gift_id: str, gift_update: GiftUpdate, _: str = Depends(get_current_admin)):
    """Update a gift"""
    update_data = {k: v for k, v in gift_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")
    
    result = await db.gifts.find_one_and_update(
        {"_id": ObjectId(gift_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Presente não encontrado")
    
    result["id"] = str(result["_id"])
    result["created_at"] = datetime.fromisoformat(result["created_at"]) if isinstance(result["created_at"], str) else result["created_at"]
    if result.get("reserved_at") and isinstance(result["reserved_at"], str):
        result["reserved_at"] = datetime.fromisoformat(result["reserved_at"])
    del result["_id"]
    
    return Gift(**result)

@api_router.delete("/gifts/{gift_id}")
async def delete_gift(gift_id: str, _: str = Depends(get_current_admin)):
    """Delete a gift"""
    # Check if it's the fixed store - don't allow deletion
    gift = await db.gifts.find_one({"_id": ObjectId(gift_id)})
    if gift and gift.get("is_fixed_store"):
        raise HTTPException(status_code=400, detail="Não é possível excluir a loja de enxovais fixa")
    
    result = await db.gifts.delete_one({"_id": ObjectId(gift_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Presente não encontrado")
    return {"message": "Presente removido com sucesso"}

# ===================== GIFT RESERVATION ENDPOINTS =====================

@api_router.post("/gifts/{gift_id}/reserve")
async def reserve_gift(gift_id: str, slug: str):
    """Reserve a gift by guest slug"""
    # Find guest
    guest = await db.guests.find_one({"slug": slug})
    if not guest:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    
    # Find gift
    gift = await db.gifts.find_one({"_id": ObjectId(gift_id)})
    if not gift:
        raise HTTPException(status_code=404, detail="Presente não encontrado")
    
    # Don't allow reserving the fixed store
    if gift.get("is_fixed_store"):
        raise HTTPException(status_code=400, detail="Este item não pode ser reservado")
    
    if gift.get("reserved_by_guest_id"):
        raise HTTPException(status_code=400, detail="Este presente já foi reservado")
    
    guest_id = str(guest["_id"])
    
    # Reserve the gift
    await db.gifts.update_one(
        {"_id": ObjectId(gift_id)},
        {"$set": {
            "reserved_by_guest_id": guest_id,
            "reserved_by_guest_name": guest["name"],
            "reserved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send webhook
    webhook_data = {
        "guest_name": guest["name"],
        "gift_name": gift["name"]
    }
    await send_webhook(WEBHOOK_GIFT, webhook_data)
    
    return {"message": "Presente reservado com sucesso"}

@api_router.post("/gifts/{gift_id}/cancel")
async def cancel_gift_reservation(gift_id: str, slug: str):
    """Cancel gift reservation by guest slug"""
    # Find guest
    guest = await db.guests.find_one({"slug": slug})
    if not guest:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    
    guest_id = str(guest["_id"])
    
    # Find gift and verify it's reserved by this guest
    gift = await db.gifts.find_one({"_id": ObjectId(gift_id)})
    if not gift:
        raise HTTPException(status_code=404, detail="Presente não encontrado")
    
    if gift.get("reserved_by_guest_id") != guest_id:
        raise HTTPException(status_code=400, detail="Você não reservou este presente")
    
    # Cancel reservation
    await db.gifts.update_one(
        {"_id": ObjectId(gift_id)},
        {"$set": {
            "reserved_by_guest_id": None,
            "reserved_by_guest_name": None,
            "reserved_at": None
        }}
    )
    
    return {"message": "Reserva cancelada com sucesso"}

# ===================== DASHBOARD ENDPOINT =====================

@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(_: str = Depends(get_current_admin)):
    """Get dashboard statistics"""
    # Count total guests
    total_guests = await db.guests.count_documents({})
    
    # Count guests who never viewed
    guests_not_viewed = await db.guests.count_documents({"$or": [{"view_count": 0}, {"view_count": {"$exists": False}}]})
    
    # Total views across all guests
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$view_count"}}}]
    view_result = await db.guests.aggregate(pipeline).to_list(1)
    total_views = view_result[0]["total"] if view_result else 0
    
    # Get all RSVPs
    rsvps = await db.rsvps.find({}).to_list(1000)
    total_confirmed = len(rsvps)
    
    total_adults = 0
    total_children = 0
    
    for rsvp in rsvps:
        # Main person is always an adult
        total_adults += 1
        # Count companions
        for companion in rsvp.get("companions", []):
            if companion.get("is_child"):
                total_children += 1
            else:
                total_adults += 1
    
    # Get gift stats (exclude fixed store)
    total_gifts = await db.gifts.count_documents({"is_fixed_store": {"$ne": True}})
    reserved_gifts = await db.gifts.count_documents({
        "reserved_by_guest_id": {"$ne": None},
        "is_fixed_store": {"$ne": True}
    })
    
    # Get reserved gifts list
    reserved_gifts_docs = await db.gifts.find({
        "reserved_by_guest_id": {"$ne": None},
        "is_fixed_store": {"$ne": True}
    }).to_list(100)
    
    reserved_gifts_list = [
        {
            "gift_name": g["name"],
            "reserved_by": g.get("reserved_by_guest_name", "Desconhecido")
        }
        for g in reserved_gifts_docs
    ]
    
    return DashboardStats(
        total_guests=total_guests,
        total_confirmed=total_confirmed,
        total_adults=total_adults,
        total_children=total_children,
        total_gifts=total_gifts,
        reserved_gifts=reserved_gifts,
        reserved_gifts_list=reserved_gifts_list,
        guests_not_viewed=guests_not_viewed,
        total_views=total_views
    )

# ===================== BACKUP ENDPOINTS =====================

@api_router.get("/backup/download")
async def download_backup(_: str = Depends(get_current_admin)):
    """Download full backup of all data"""
    # Get all collections data
    guests = await db.guests.find({}).to_list(10000)
    rsvps = await db.rsvps.find({}).to_list(10000)
    gifts = await db.gifts.find({}).to_list(10000)
    view_logs = await db.view_logs.find({}).to_list(100000)
    
    # Convert ObjectId to string
    for g in guests:
        g["_id"] = str(g["_id"])
    for r in rsvps:
        r["_id"] = str(r["_id"])
    for gift in gifts:
        gift["_id"] = str(gift["_id"])
    for v in view_logs:
        v["_id"] = str(v["_id"])
    
    backup_data = {
        "backup_date": datetime.now(timezone.utc).isoformat(),
        "guests": guests,
        "rsvps": rsvps,
        "gifts": gifts,
        "view_logs": view_logs
    }
    
    # Create JSON file in memory
    json_str = json.dumps(backup_data, ensure_ascii=False, indent=2)
    buffer = io.BytesIO(json_str.encode('utf-8'))
    buffer.seek(0)
    
    filename = f"backup_cha_de_panela_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    return StreamingResponse(
        buffer,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.post("/backup/upload")
async def upload_backup(file: UploadFile = File(...), _: str = Depends(get_current_admin)):
    """Upload and restore backup"""
    try:
        content = await file.read()
        backup_data = json.loads(content.decode('utf-8'))
        
        # Validate backup structure
        if not all(key in backup_data for key in ["guests", "rsvps", "gifts"]):
            raise HTTPException(status_code=400, detail="Arquivo de backup inválido")
        
        # Clear existing data (except fixed store)
        fixed_store = await db.gifts.find_one({"is_fixed_store": True})
        
        await db.guests.delete_many({})
        await db.rsvps.delete_many({})
        await db.gifts.delete_many({"is_fixed_store": {"$ne": True}})
        await db.view_logs.delete_many({})
        
        # Restore guests
        if backup_data["guests"]:
            for g in backup_data["guests"]:
                if "_id" in g:
                    g["_id"] = ObjectId(g["_id"])
            await db.guests.insert_many(backup_data["guests"])
        
        # Restore RSVPs
        if backup_data["rsvps"]:
            for r in backup_data["rsvps"]:
                if "_id" in r:
                    r["_id"] = ObjectId(r["_id"])
            await db.rsvps.insert_many(backup_data["rsvps"])
        
        # Restore gifts (excluding fixed store if already exists)
        if backup_data["gifts"]:
            gifts_to_restore = []
            for gift in backup_data["gifts"]:
                if "_id" in gift:
                    gift["_id"] = ObjectId(gift["_id"])
                # Skip fixed store from backup if we already have one
                if not gift.get("is_fixed_store") or not fixed_store:
                    gifts_to_restore.append(gift)
            if gifts_to_restore:
                await db.gifts.insert_many(gifts_to_restore)
        
        # Restore view logs if present
        if backup_data.get("view_logs"):
            for v in backup_data["view_logs"]:
                if "_id" in v:
                    v["_id"] = ObjectId(v["_id"])
            await db.view_logs.insert_many(backup_data["view_logs"])
        
        return {"message": "Backup restaurado com sucesso", "restored": {
            "guests": len(backup_data["guests"]),
            "rsvps": len(backup_data["rsvps"]),
            "gifts": len(backup_data["gifts"]),
            "view_logs": len(backup_data.get("view_logs", []))
        }}
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Arquivo JSON inválido")
    except Exception as e:
        logger.error(f"Backup restore error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao restaurar backup: {str(e)}")

# ===================== MESSAGE GENERATION ENDPOINT =====================

@api_router.get("/guests/{guest_id}/message")
async def get_invitation_message(guest_id: str, _: str = Depends(get_current_admin)):
    """Generate invitation message with unique link"""
    guest = await db.guests.find_one({"_id": ObjectId(guest_id)})
    if not guest:
        raise HTTPException(status_code=404, detail="Convidado não encontrado")
    
    base_url = os.environ.get('FRONTEND_URL', 'https://williamemallu.copyetech.shop')
    invite_url = f"{base_url}/{guest['slug']}"
    
    if guest["guest_type"] == "couple":
        message = f"""Olá {guest['name']}! 

Vocês estão convidados para o Chá de Panela de William & Mallu!

Data: 21 de Junho de 2026, às 13h

Confirmem sua presença através do link exclusivo:
{invite_url}

Esperamos vocês! 🎉"""
    else:
        message = f"""Olá {guest['name']}! 

Você está convidado(a) para o Chá de Panela de William & Mallu!

Data: 21 de Junho de 2026, às 13h

Confirme sua presença através do link exclusivo:
{invite_url}

Esperamos você! 🎉"""
    
    return {"message": message, "url": invite_url}

# ===================== SEED FIXED STORE =====================

async def seed_fixed_store():
    """Seed the fixed Renove Enxovais store card if it doesn't exist"""
    existing = await db.gifts.find_one({"is_fixed_store": True})
    if not existing:
        fixed_store = {
            "name": "Lista Renove Enxovais",
            "description": "Acesse nossa lista de presentes na Loja Renove Enxovais. A loja atualiza constantemente os itens disponíveis!",
            "image_url": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600",
            "external_link": "https://www.renoveenxovais.com.br",
            "coupon_code": None,
            "is_local": False,
            "is_fixed_store": True,
            "store_map_link": "https://share.google/EadAgHB8r21XeiiFh",
            "reserved_by_guest_id": None,
            "reserved_by_guest_name": None,
            "reserved_at": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.gifts.insert_one(fixed_store)
        logger.info("Fixed store card seeded: Renove Enxovais")

# ===================== ROOT ENDPOINT =====================

@api_router.get("/")
async def root():
    return {"message": "Chá de Panela API - William & Mallu"}

# Include the router in the main app
app.include_router(api_router)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Create indexes on startup and seed fixed store"""
    await db.guests.create_index("slug", unique=True)
    await db.rsvps.create_index("guest_id")
    await db.rsvps.create_index("guest_slug")
    await db.view_logs.create_index("guest_id")
    await db.view_logs.create_index("viewed_at")
    await db.gifts.create_index("is_fixed_store")
    logger.info("Database indexes created")
    
    # Seed fixed store
    await seed_fixed_store()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

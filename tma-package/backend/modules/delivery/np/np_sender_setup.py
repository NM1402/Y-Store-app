"""
Nova Poshta Sender Setup - Auto-configure sender refs
"""
from typing import Dict, Any, Optional
from pydantic import BaseModel
import logging

from .np_client import np_client

logger = logging.getLogger(__name__)


class SenderSetupRequest(BaseModel):
    """Request to setup sender"""
    city_name: str = "Київ"
    warehouse_number: Optional[str] = "1"  # Відділення №1
    # For new counterparty creation
    company_name: Optional[str] = "Y-Store"
    first_name: Optional[str] = "Менеджер"
    last_name: Optional[str] = "Y-Store"
    middle_name: Optional[str] = ""
    phone: str  # Required: +380XXXXXXXXX


class SenderSetupResponse(BaseModel):
    """Response with all sender refs"""
    ok: bool
    city_ref: Optional[str] = None
    city_name: Optional[str] = None
    warehouse_ref: Optional[str] = None
    warehouse_description: Optional[str] = None
    counterparty_ref: Optional[str] = None
    contact_ref: Optional[str] = None
    env_config: Optional[str] = None  # Ready-to-copy .env config
    errors: Optional[list] = None


class NPSenderSetup:
    """Service to setup Nova Poshta sender configuration"""
    
    def __init__(self):
        self.client = np_client
    
    async def search_city(self, city_name: str) -> Dict[str, Any]:
        """Search for city by name"""
        result = await self.client.call(
            "Address",
            "searchSettlements",
            {"CityName": city_name, "Limit": 5}
        )
        return result
    
    async def get_warehouses(self, city_ref: str, number: Optional[str] = None) -> Dict[str, Any]:
        """Get warehouses for city"""
        props = {"CityRef": city_ref, "Limit": 50}
        if number:
            props["FindByString"] = f"№{number}"
        
        result = await self.client.call(
            "Address",
            "getWarehouses",
            props
        )
        return result
    
    async def get_counterparties(self) -> Dict[str, Any]:
        """Get existing counterparties"""
        result = await self.client.call(
            "Counterparty",
            "getCounterparties",
            {"CounterpartyProperty": "Sender"}
        )
        return result
    
    async def create_counterparty(
        self,
        first_name: str,
        last_name: str,
        middle_name: str,
        phone: str,
        company_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create new sender counterparty"""
        props = {
            "FirstName": first_name,
            "LastName": last_name,
            "MiddleName": middle_name or "",
            "Phone": phone,
            "CounterpartyType": "PrivatePerson",
            "CounterpartyProperty": "Sender",
        }
        
        # For company/organization
        if company_name:
            props["CounterpartyType"] = "Organization"
            props["EDRPOU"] = ""  # Can be added later
        
        result = await self.client.call(
            "Counterparty",
            "save",
            props
        )
        return result
    
    async def get_contact_persons(self, counterparty_ref: str) -> Dict[str, Any]:
        """Get contact persons for counterparty"""
        result = await self.client.call(
            "Counterparty",
            "getCounterpartyContactPersons",
            {"Ref": counterparty_ref}
        )
        return result
    
    async def setup_sender(self, req: SenderSetupRequest) -> SenderSetupResponse:
        """
        Full sender setup flow:
        1. Find city
        2. Find warehouse
        3. Get or create counterparty
        4. Get contact person
        5. Return all refs + ready .env config
        """
        errors = []
        
        # Step 1: Find city
        city_result = await self.search_city(req.city_name)
        if not city_result.get("success"):
            return SenderSetupResponse(
                ok=False, 
                errors=city_result.get("errors", ["City search failed"])
            )
        
        addresses = (city_result.get("data") or [{}])[0].get("Addresses", [])
        if not addresses:
            return SenderSetupResponse(ok=False, errors=["City not found"])
        
        city_ref = addresses[0].get("DeliveryCity")
        city_name = addresses[0].get("Present")
        logger.info(f"Found city: {city_name} ({city_ref})")
        
        # Step 2: Find warehouse
        wh_result = await self.get_warehouses(city_ref, req.warehouse_number)
        if not wh_result.get("success"):
            errors.append(f"Warehouse search failed: {wh_result.get('errors')}")
        
        warehouses = wh_result.get("data", [])
        warehouse_ref = None
        warehouse_desc = None
        
        if warehouses:
            # Find by number or take first
            for wh in warehouses:
                if req.warehouse_number and req.warehouse_number in wh.get("Number", ""):
                    warehouse_ref = wh.get("Ref")
                    warehouse_desc = wh.get("Description")
                    break
            
            if not warehouse_ref:
                warehouse_ref = warehouses[0].get("Ref")
                warehouse_desc = warehouses[0].get("Description")
            
            logger.info(f"Found warehouse: {warehouse_desc} ({warehouse_ref})")
        else:
            errors.append("No warehouses found")
        
        # Step 3: Get or create counterparty
        cp_result = await self.get_counterparties()
        counterparty_ref = None
        contact_ref = None
        
        if cp_result.get("success") and cp_result.get("data"):
            # Use existing counterparty
            counterparty_ref = cp_result["data"][0].get("Ref")
            logger.info(f"Found existing counterparty: {counterparty_ref}")
        else:
            # Create new counterparty
            new_cp = await self.create_counterparty(
                first_name=req.first_name,
                last_name=req.last_name,
                middle_name=req.middle_name,
                phone=req.phone,
                company_name=req.company_name
            )
            
            if new_cp.get("success") and new_cp.get("data"):
                counterparty_ref = new_cp["data"][0].get("Ref")
                contact_ref = new_cp["data"][0].get("ContactPerson", {}).get("Ref")
                logger.info(f"Created counterparty: {counterparty_ref}")
            else:
                errors.append(f"Failed to create counterparty: {new_cp.get('errors')}")
        
        # Step 4: Get contact person
        if counterparty_ref and not contact_ref:
            contacts = await self.get_contact_persons(counterparty_ref)
            if contacts.get("success") and contacts.get("data"):
                contact_ref = contacts["data"][0].get("Ref")
                logger.info(f"Found contact: {contact_ref}")
        
        # Build .env config
        env_config = None
        if city_ref and warehouse_ref and counterparty_ref:
            env_config = f"""# Nova Poshta Sender Configuration
NP_API_KEY=5cb1e3ebc23e75d737fd57c1e056ecc9
NP_SENDER_CITY_REF={city_ref}
NP_SENDER_WAREHOUSE_REF={warehouse_ref}
NP_SENDER_COUNTERPARTY_REF={counterparty_ref}
NP_SENDER_CONTACT_REF={contact_ref or ''}
NP_SENDER_PHONE={req.phone}
NP_SENDER_NAME={req.company_name or 'Y-Store'}"""
        
        return SenderSetupResponse(
            ok=bool(city_ref and warehouse_ref and counterparty_ref),
            city_ref=city_ref,
            city_name=city_name,
            warehouse_ref=warehouse_ref,
            warehouse_description=warehouse_desc,
            counterparty_ref=counterparty_ref,
            contact_ref=contact_ref,
            env_config=env_config,
            errors=errors if errors else None
        )


# Singleton
np_sender_setup = NPSenderSetup()

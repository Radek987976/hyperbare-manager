#!/usr/bin/env python3
"""
HyperMaint GMAO Backend API Testing Suite
Tests all new features including equipment types, sub-equipments, interventions, dashboard stats, and exports
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import os

# Configuration
BASE_URL = "https://chamber-maintenance.preview.emergentagent.com/api"
AUTH_EMAIL = "admin@hypermaint.fr"
AUTH_PASSWORD = "admin123"

class HyperMaintTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.test_results = []
        self.created_resources = {
            'equipment_types': [],
            'equipments': [],
            'subequipments': [],
            'work_orders': [],
            'interventions': [],
            'inspections': [],
            'contractors': [],
            'gas_cylinders': [],
            'contracts': [],
            'budget_items': [],
            'report_templates': [],
            'documents': []
        }
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'status': status,
            'message': message,
            'details': details or {}
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Authenticate and get JWT token"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": AUTH_EMAIL,
                "password": AUTH_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                self.log_result("Authentication", True, "Successfully authenticated")
                return True
            else:
                self.log_result("Authentication", False, f"Failed with status {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_equipment_types_crud(self):
        """Test Equipment Types CRUD operations"""
        print("\n=== Testing Equipment Types CRUD ===")
        
        # 1. GET equipment types (should return defaults or existing)
        try:
            response = self.session.get(f"{BASE_URL}/equipment-types")
            if response.status_code == 200:
                types = response.json()
                self.log_result("GET Equipment Types", True, f"Retrieved {len(types)} equipment types")
            else:
                self.log_result("GET Equipment Types", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Equipment Types", False, f"Exception: {str(e)}")
        
        # 2. POST new equipment type
        try:
            new_type_data = {
                "nom": "Test Equipment Type",
                "description": "Test description for equipment type"
            }
            response = self.session.post(f"{BASE_URL}/equipment-types", json=new_type_data)
            if response.status_code == 200:
                created_type = response.json()
                type_id = created_type.get('id')
                self.created_resources['equipment_types'].append(type_id)
                self.log_result("POST Equipment Type", True, f"Created equipment type with ID: {type_id}")
            else:
                self.log_result("POST Equipment Type", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST Equipment Type", False, f"Exception: {str(e)}")
        
        # 3. PUT update equipment type
        if self.created_resources['equipment_types']:
            try:
                type_id = self.created_resources['equipment_types'][0]
                update_data = {
                    "nom": "Updated Test Equipment Type",
                    "description": "Updated description"
                }
                response = self.session.put(f"{BASE_URL}/equipment-types/{type_id}", json=update_data)
                if response.status_code == 200:
                    self.log_result("PUT Equipment Type", True, f"Updated equipment type {type_id}")
                else:
                    self.log_result("PUT Equipment Type", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("PUT Equipment Type", False, f"Exception: {str(e)}")
        
        # 4. DELETE equipment type (will test later after cleanup)
    
    def test_subequipments_crud(self):
        """Test Sub-Equipments CRUD operations"""
        print("\n=== Testing Sub-Equipments CRUD ===")
        
        # First, get existing equipments to use as parent
        parent_equipment_id = None
        try:
            response = self.session.get(f"{BASE_URL}/equipments")
            if response.status_code == 200:
                equipments = response.json()
                if equipments:
                    parent_equipment_id = equipments[0].get('id')
                    self.log_result("Get Parent Equipment", True, f"Found parent equipment: {parent_equipment_id}")
                else:
                    # Create a test equipment first
                    equipment_data = {
                        "type": "compresseur",
                        "reference": "TEST-COMP-001",
                        "numero_serie": "SN-TEST-001",
                        "criticite": "normale",
                        "statut": "en_service",
                        "caisson_id": "test-caisson-id"
                    }
                    eq_response = self.session.post(f"{BASE_URL}/equipments", json=equipment_data)
                    if eq_response.status_code == 200:
                        parent_equipment_id = eq_response.json().get('id')
                        self.created_resources['equipments'].append(parent_equipment_id)
                        self.log_result("Create Parent Equipment", True, f"Created parent equipment: {parent_equipment_id}")
            else:
                self.log_result("Get Parent Equipment", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Parent Equipment", False, f"Exception: {str(e)}")
        
        if not parent_equipment_id:
            self.log_result("Sub-Equipment Tests", False, "No parent equipment available")
            return
        
        # 1. POST create sub-equipment
        try:
            subequip_data = {
                "nom": "Test Sub-Equipment",
                "reference": "SUB-TEST-001",
                "parent_equipment_id": parent_equipment_id,
                "statut": "en_service",
                "description": "Test sub-equipment description"
            }
            response = self.session.post(f"{BASE_URL}/subequipments", json=subequip_data)
            if response.status_code == 200:
                created_subequip = response.json()
                subequip_id = created_subequip.get('id')
                self.created_resources['subequipments'].append(subequip_id)
                self.log_result("POST Sub-Equipment", True, f"Created sub-equipment with ID: {subequip_id}")
            else:
                self.log_result("POST Sub-Equipment", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST Sub-Equipment", False, f"Exception: {str(e)}")
        
        # 2. GET all sub-equipments
        try:
            response = self.session.get(f"{BASE_URL}/subequipments")
            if response.status_code == 200:
                subequipments = response.json()
                self.log_result("GET Sub-Equipments", True, f"Retrieved {len(subequipments)} sub-equipments")
            else:
                self.log_result("GET Sub-Equipments", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Sub-Equipments", False, f"Exception: {str(e)}")
        
        # 3. GET sub-equipments filtered by parent
        try:
            response = self.session.get(f"{BASE_URL}/subequipments?parent_equipment_id={parent_equipment_id}")
            if response.status_code == 200:
                filtered_subequipments = response.json()
                self.log_result("GET Sub-Equipments Filtered", True, f"Retrieved {len(filtered_subequipments)} sub-equipments for parent")
            else:
                self.log_result("GET Sub-Equipments Filtered", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Sub-Equipments Filtered", False, f"Exception: {str(e)}")
        
        # 4. PUT update sub-equipment
        if self.created_resources['subequipments']:
            try:
                subequip_id = self.created_resources['subequipments'][0]
                update_data = {
                    "nom": "Updated Test Sub-Equipment",
                    "reference": "SUB-TEST-001-UPDATED",
                    "parent_equipment_id": parent_equipment_id,
                    "statut": "maintenance"
                }
                response = self.session.put(f"{BASE_URL}/subequipments/{subequip_id}", json=update_data)
                if response.status_code == 200:
                    self.log_result("PUT Sub-Equipment", True, f"Updated sub-equipment {subequip_id}")
                else:
                    self.log_result("PUT Sub-Equipment", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("PUT Sub-Equipment", False, f"Exception: {str(e)}")
    
    def test_interventions_curative_preventive(self):
        """Test Interventions with curative and preventive types"""
        print("\n=== Testing Interventions (Curative/Preventive) ===")
        
        # First get work orders and inspections
        work_order_id = None
        inspection_id = None
        
        # Get work orders
        try:
            response = self.session.get(f"{BASE_URL}/work-orders")
            if response.status_code == 200:
                work_orders = response.json()
                if work_orders:
                    work_order_id = work_orders[0].get('id')
                    self.log_result("Get Work Orders", True, f"Found {len(work_orders)} work orders")
                else:
                    # Create a test work order
                    wo_data = {
                        "titre": "Test Work Order for Intervention",
                        "description": "Test work order description",
                        "type_maintenance": "corrective",
                        "priorite": "normale",
                        "statut": "planifiee",
                        "date_planifiee": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
                    }
                    wo_response = self.session.post(f"{BASE_URL}/work-orders", json=wo_data)
                    if wo_response.status_code == 200:
                        work_order_id = wo_response.json().get('id')
                        self.created_resources['work_orders'].append(work_order_id)
                        self.log_result("Create Work Order", True, f"Created work order: {work_order_id}")
            else:
                self.log_result("Get Work Orders", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Work Orders", False, f"Exception: {str(e)}")
        
        # Get inspections (maintenance préventive)
        try:
            response = self.session.get(f"{BASE_URL}/inspections")
            if response.status_code == 200:
                inspections = response.json()
                if inspections:
                    inspection_id = inspections[0].get('id')
                    self.log_result("Get Inspections", True, f"Found {len(inspections)} inspections")
                else:
                    # Create a test inspection
                    insp_data = {
                        "titre": "Test Preventive Maintenance",
                        "type_controle": "maintenance_preventive",
                        "periodicite": "mensuel",
                        "date_realisation": datetime.now().strftime("%Y-%m-%d")
                    }
                    insp_response = self.session.post(f"{BASE_URL}/inspections", json=insp_data)
                    if insp_response.status_code == 200:
                        inspection_id = insp_response.json().get('id')
                        self.created_resources['inspections'].append(inspection_id)
                        self.log_result("Create Inspection", True, f"Created inspection: {inspection_id}")
            else:
                self.log_result("Get Inspections", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Inspections", False, f"Exception: {str(e)}")
        
        # Test curative intervention
        if work_order_id:
            try:
                curative_data = {
                    "type_intervention": "curative",
                    "work_order_id": work_order_id,
                    "date_intervention": datetime.now().strftime("%Y-%m-%d"),
                    "technicien": "Test Technician",
                    "actions_realisees": "Test curative action performed"
                }
                response = self.session.post(f"{BASE_URL}/interventions", json=curative_data)
                if response.status_code == 200:
                    intervention = response.json()
                    self.created_resources['interventions'].append(intervention.get('id'))
                    self.log_result("POST Curative Intervention", True, f"Created curative intervention: {intervention.get('id')}")
                else:
                    self.log_result("POST Curative Intervention", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("POST Curative Intervention", False, f"Exception: {str(e)}")
        
        # Test preventive intervention
        if inspection_id:
            try:
                # Get the inspection first to check its current date_validite
                insp_response = self.session.get(f"{BASE_URL}/inspections/{inspection_id}")
                original_date_validite = None
                if insp_response.status_code == 200:
                    original_date_validite = insp_response.json().get('date_validite')
                
                preventive_data = {
                    "type_intervention": "preventive",
                    "maintenance_preventive_id": inspection_id,
                    "date_intervention": datetime.now().strftime("%Y-%m-%d"),
                    "technicien": "Test Technician",
                    "actions_realisees": "Maintenance préventive réalisée"
                }
                response = self.session.post(f"{BASE_URL}/interventions", json=preventive_data)
                if response.status_code == 200:
                    intervention = response.json()
                    self.created_resources['interventions'].append(intervention.get('id'))
                    self.log_result("POST Preventive Intervention", True, f"Created preventive intervention: {intervention.get('id')}")
                    
                    # Verify that the inspection's date_validite was updated
                    updated_insp_response = self.session.get(f"{BASE_URL}/inspections/{inspection_id}")
                    if updated_insp_response.status_code == 200:
                        updated_inspection = updated_insp_response.json()
                        new_date_validite = updated_inspection.get('date_validite')
                        new_date_realisation = updated_inspection.get('date_realisation')
                        
                        # Check if date_realisation was updated to intervention date
                        if new_date_realisation == preventive_data["date_intervention"]:
                            self.log_result("Preventive Intervention Date Update", True, f"Inspection updated: date_realisation={new_date_realisation}, date_validite={new_date_validite}")
                        else:
                            self.log_result("Preventive Intervention Date Update", False, f"Date realisation not updated. Expected: {preventive_data['date_intervention']}, Got: {new_date_realisation}")
                else:
                    self.log_result("POST Preventive Intervention", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("POST Preventive Intervention", False, f"Exception: {str(e)}")
    
    def test_dashboard_stats_compressors(self):
        """Test Dashboard Stats with Compressors"""
        print("\n=== Testing Dashboard Stats with Compressors ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/dashboard/stats")
            if response.status_code == 200:
                stats = response.json()
                
                # Check if compresseurs array exists
                if 'compresseurs' in stats:
                    compresseurs = stats['compresseurs']
                    self.log_result("Dashboard Stats - Compressors Array", True, f"Found compresseurs array with {len(compresseurs)} items")
                    
                    # Check if compressors have compteur_horaire
                    has_compteur = any('compteur_horaire' in comp for comp in compresseurs)
                    if has_compteur:
                        self.log_result("Dashboard Stats - Compteur Horaire", True, "Compressors include compteur_horaire field")
                    else:
                        self.log_result("Dashboard Stats - Compteur Horaire", False, "Compressors missing compteur_horaire field")
                else:
                    self.log_result("Dashboard Stats - Compressors Array", False, "Missing compresseurs array in stats")
                
                # Check other expected fields
                expected_fields = ['equipment_stats', 'work_order_stats', 'low_stock_count', 'total_spare_parts']
                for field in expected_fields:
                    if field in stats:
                        self.log_result(f"Dashboard Stats - {field}", True, f"Field {field} present")
                    else:
                        self.log_result(f"Dashboard Stats - {field}", False, f"Field {field} missing")
                        
            else:
                self.log_result("Dashboard Stats", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Dashboard Stats", False, f"Exception: {str(e)}")
    
    def test_export_endpoints(self):
        """Test Export endpoints"""
        print("\n=== Testing Export Endpoints ===")
        
        # Test CSV export for equipments
        try:
            response = self.session.get(f"{BASE_URL}/export/csv/equipments")
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'csv' in content_type or 'text' in content_type:
                    self.log_result("CSV Export - Equipments", True, f"CSV export successful, content-type: {content_type}")
                else:
                    self.log_result("CSV Export - Equipments", False, f"Unexpected content-type: {content_type}")
            else:
                self.log_result("CSV Export - Equipments", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("CSV Export - Equipments", False, f"Exception: {str(e)}")
        
        # Test JSON export
        try:
            response = self.session.get(f"{BASE_URL}/export/json")
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'json' in content_type:
                    self.log_result("JSON Export", True, f"JSON export successful, content-type: {content_type}")
                else:
                    self.log_result("JSON Export", False, f"Unexpected content-type: {content_type}")
            else:
                self.log_result("JSON Export", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("JSON Export", False, f"Exception: {str(e)}")
        
        # Test SQL export
        try:
            response = self.session.get(f"{BASE_URL}/export/sql")
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'sql' in content_type or 'application' in content_type:
                    self.log_result("SQL Export", True, f"SQL export successful, content-type: {content_type}")
                else:
                    self.log_result("SQL Export", False, f"Unexpected content-type: {content_type}")
            else:
                self.log_result("SQL Export", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("SQL Export", False, f"Exception: {str(e)}")
    
    def test_work_order_delete(self):
        """Test Work Order Delete functionality"""
        print("\n=== Testing Work Order Delete ===")
        
        # Create a work order specifically for deletion test
        try:
            wo_data = {
                "titre": "Work Order for Deletion Test",
                "description": "This work order will be deleted",
                "type_maintenance": "corrective",
                "priorite": "basse",
                "statut": "planifiee",
                "date_planifiee": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
            }
            response = self.session.post(f"{BASE_URL}/work-orders", json=wo_data)
            if response.status_code == 200:
                wo_id = response.json().get('id')
                self.log_result("Create Work Order for Deletion", True, f"Created work order: {wo_id}")
                
                # Now delete it
                delete_response = self.session.delete(f"{BASE_URL}/work-orders/{wo_id}")
                if delete_response.status_code == 200:
                    self.log_result("DELETE Work Order", True, f"Successfully deleted work order: {wo_id}")
                    
                    # Verify it's actually deleted
                    get_response = self.session.get(f"{BASE_URL}/work-orders/{wo_id}")
                    if get_response.status_code == 404:
                        self.log_result("Verify Work Order Deletion", True, "Work order properly deleted (404 on GET)")
                    else:
                        self.log_result("Verify Work Order Deletion", False, f"Work order still exists (status {get_response.status_code})")
                else:
                    self.log_result("DELETE Work Order", False, f"Status {delete_response.status_code}", delete_response.text)
            else:
                self.log_result("Create Work Order for Deletion", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Work Order Delete Test", False, f"Exception: {str(e)}")
    
    def test_contractors_crud(self):
        """Test Contractors API CRUD operations"""
        print("\n=== Testing Contractors API ===")
        
        # 1. GET all contractors (should return 12 default prestataires)
        try:
            response = self.session.get(f"{BASE_URL}/contractors")
            if response.status_code == 200:
                contractors = response.json()
                self.log_result("GET Contractors", True, f"Retrieved {len(contractors)} contractors")
            else:
                self.log_result("GET Contractors", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Contractors", False, f"Exception: {str(e)}")
        
        # 2. POST create new contractor
        try:
            contractor_data = {
                "nom": "Test Contractor Ltd",
                "type": "prestataire",
                "specialite": "Test Maintenance Services",
                "contact_nom": "John Doe",
                "contact_email": "john@testcontractor.com",
                "contact_telephone": "+689 87 12 34 56",
                "adresse": "123 Test Street, Papeete"
            }
            response = self.session.post(f"{BASE_URL}/contractors", json=contractor_data)
            if response.status_code == 200:
                contractor = response.json()
                contractor_id = contractor.get('id')
                self.created_resources['contractors'].append(contractor_id)
                self.log_result("POST Contractor", True, f"Created contractor with ID: {contractor_id}")
            else:
                self.log_result("POST Contractor", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST Contractor", False, f"Exception: {str(e)}")
        
        # 3. PUT update contractor
        if self.created_resources['contractors']:
            try:
                contractor_id = self.created_resources['contractors'][0]
                update_data = {
                    "nom": "Updated Test Contractor Ltd",
                    "type": "fournisseur",
                    "specialite": "Updated Services",
                    "contact_nom": "Jane Doe"
                }
                response = self.session.put(f"{BASE_URL}/contractors/{contractor_id}", json=update_data)
                if response.status_code == 200:
                    self.log_result("PUT Contractor", True, f"Updated contractor {contractor_id}")
                else:
                    self.log_result("PUT Contractor", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("PUT Contractor", False, f"Exception: {str(e)}")
        
        # 4. GET single contractor
        if self.created_resources['contractors']:
            try:
                contractor_id = self.created_resources['contractors'][0]
                response = self.session.get(f"{BASE_URL}/contractors/{contractor_id}")
                if response.status_code == 200:
                    contractor = response.json()
                    self.log_result("GET Single Contractor", True, f"Retrieved contractor: {contractor.get('nom')}")
                else:
                    self.log_result("GET Single Contractor", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("GET Single Contractor", False, f"Exception: {str(e)}")
    
    def test_gas_cylinders_crud(self):
        """Test Gas Cylinders API CRUD operations"""
        print("\n=== Testing Gas Cylinders API ===")
        
        # 1. GET all gas cylinders
        try:
            response = self.session.get(f"{BASE_URL}/gas-cylinders")
            if response.status_code == 200:
                cylinders = response.json()
                self.log_result("GET Gas Cylinders", True, f"Retrieved {len(cylinders)} gas cylinders")
            else:
                self.log_result("GET Gas Cylinders", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Gas Cylinders", False, f"Exception: {str(e)}")
        
        # 2. POST create new gas cylinder (test each gas type)
        gas_types = ["O2", "air_medicale", "heliox", "nitrox"]
        for gas_type in gas_types:
            try:
                cylinder_data = {
                    "numero_bouteille": f"TEST-{gas_type}-001",
                    "type_gaz": gas_type,
                    "volume": "B50",
                    "pression_service": 200.0,
                    "localisation": "Test Storage Area",
                    "date_remplissage": "2026-01-15",
                    "date_expiration_gaz": "2027-01-15",
                    "date_prochaine_epreuve": "2031-01-15",
                    "statut": "pleine",
                    "agent_responsable": "Test Agent"
                }
                response = self.session.post(f"{BASE_URL}/gas-cylinders", json=cylinder_data)
                if response.status_code == 200:
                    cylinder = response.json()
                    cylinder_id = cylinder.get('id')
                    self.created_resources['gas_cylinders'].append(cylinder_id)
                    self.log_result(f"POST Gas Cylinder ({gas_type})", True, f"Created {gas_type} cylinder with ID: {cylinder_id}")
                else:
                    self.log_result(f"POST Gas Cylinder ({gas_type})", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result(f"POST Gas Cylinder ({gas_type})", False, f"Exception: {str(e)}")
        
        # 3. GET gas cylinder alerts
        try:
            response = self.session.get(f"{BASE_URL}/gas-cylinders/alerts")
            if response.status_code == 200:
                alerts = response.json()
                expected_keys = ["gaz_expire", "epreuve_expire", "gaz_expire_30j", "epreuve_expire_90j"]
                has_all_keys = all(key in alerts for key in expected_keys)
                if has_all_keys:
                    self.log_result("GET Gas Cylinder Alerts", True, f"Retrieved alerts with all expected keys")
                else:
                    self.log_result("GET Gas Cylinder Alerts", False, f"Missing expected keys in alerts response")
            else:
                self.log_result("GET Gas Cylinder Alerts", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Gas Cylinder Alerts", False, f"Exception: {str(e)}")
        
        # 4. POST refill gas cylinder
        if self.created_resources['gas_cylinders']:
            try:
                cylinder_id = self.created_resources['gas_cylinders'][0]
                refill_data = {
                    "date_remplissage": "2026-02-01",
                    "date_expiration": "2027-02-01",
                    "pression": 200.0,
                    "agent": "Test Refill Agent",
                    "observations": "Test refill operation"
                }
                response = self.session.post(f"{BASE_URL}/gas-cylinders/{cylinder_id}/refill", data=refill_data)
                if response.status_code == 200:
                    updated_cylinder = response.json()
                    if updated_cylinder.get('statut') == 'pleine':
                        self.log_result("POST Refill Gas Cylinder", True, f"Successfully refilled cylinder {cylinder_id}")
                    else:
                        self.log_result("POST Refill Gas Cylinder", False, f"Cylinder status not updated to 'pleine'")
                else:
                    self.log_result("POST Refill Gas Cylinder", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("POST Refill Gas Cylinder", False, f"Exception: {str(e)}")
        
        # 5. PUT update gas cylinder
        if self.created_resources['gas_cylinders']:
            try:
                cylinder_id = self.created_resources['gas_cylinders'][0]
                update_data = {
                    "numero_bouteille": "TEST-O2-001-UPDATED",
                    "type_gaz": "O2",
                    "volume": "B50",
                    "statut": "en_cours",
                    "observations": "Updated test cylinder"
                }
                response = self.session.put(f"{BASE_URL}/gas-cylinders/{cylinder_id}", json=update_data)
                if response.status_code == 200:
                    self.log_result("PUT Gas Cylinder", True, f"Updated gas cylinder {cylinder_id}")
                else:
                    self.log_result("PUT Gas Cylinder", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("PUT Gas Cylinder", False, f"Exception: {str(e)}")
        
        # 6. GET filtered gas cylinders by type
        try:
            response = self.session.get(f"{BASE_URL}/gas-cylinders?type_gaz=O2")
            if response.status_code == 200:
                cylinders = response.json()
                all_o2 = all(cyl.get('type_gaz') == 'O2' for cyl in cylinders)
                if all_o2:
                    self.log_result("GET Gas Cylinders Filtered", True, f"Retrieved {len(cylinders)} O2 cylinders")
                else:
                    self.log_result("GET Gas Cylinders Filtered", False, "Filter not working correctly")
            else:
                self.log_result("GET Gas Cylinders Filtered", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Gas Cylinders Filtered", False, f"Exception: {str(e)}")
    
    def test_budget_api(self):
        """Test Budget API operations"""
        print("\n=== Testing Budget API ===")
        
        # 1. GET all budget items
        try:
            response = self.session.get(f"{BASE_URL}/budget")
            if response.status_code == 200:
                items = response.json()
                self.log_result("GET Budget Items", True, f"Retrieved {len(items)} budget items")
            else:
                self.log_result("GET Budget Items", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Budget Items", False, f"Exception: {str(e)}")
        
        # 2. POST create budget item (with XPF to EUR conversion)
        try:
            budget_data = {
                "annee": 2026,
                "categorie": "maintenance_preventive",
                "designation": "Test Maintenance Budget Item",
                "description": "Test budget item for maintenance",
                "montant_prevu_xpf": 100000,
                "periodicite": "annuel",
                "statut": "prevu"
            }
            response = self.session.post(f"{BASE_URL}/budget", json=budget_data)
            if response.status_code == 200:
                item = response.json()
                item_id = item.get('id')
                self.created_resources['budget_items'].append(item_id)
                
                # Check XPF to EUR conversion (1 XPF = 0.00838 EUR)
                expected_eur = round(100000 * 0.00838, 2)
                actual_eur = item.get('montant_prevu_eur')
                if actual_eur == expected_eur:
                    self.log_result("POST Budget Item (XPF to EUR)", True, f"Created budget item with correct EUR conversion: {actual_eur} EUR")
                else:
                    self.log_result("POST Budget Item (XPF to EUR)", False, f"EUR conversion incorrect. Expected: {expected_eur}, Got: {actual_eur}")
            else:
                self.log_result("POST Budget Item", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST Budget Item", False, f"Exception: {str(e)}")
        
        # 3. GET budget summary for year 2026
        try:
            response = self.session.get(f"{BASE_URL}/budget/summary/2026")
            if response.status_code == 200:
                summary = response.json()
                expected_fields = ["annee", "total_prevu_xpf", "total_prevu_eur", "total_realise_xpf", "total_realise_eur", "par_categorie", "items"]
                has_all_fields = all(field in summary for field in expected_fields)
                if has_all_fields:
                    self.log_result("GET Budget Summary", True, f"Retrieved budget summary for 2026 with all expected fields")
                else:
                    missing = [f for f in expected_fields if f not in summary]
                    self.log_result("GET Budget Summary", False, f"Missing fields: {missing}")
            else:
                self.log_result("GET Budget Summary", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Budget Summary", False, f"Exception: {str(e)}")
        
        # 4. PUT update budget item
        if self.created_resources['budget_items']:
            try:
                item_id = self.created_resources['budget_items'][0]
                update_data = {
                    "annee": 2026,
                    "categorie": "pieces_detachees",
                    "designation": "Updated Test Budget Item",
                    "montant_prevu_xpf": 150000,
                    "montant_realise_xpf": 145000,
                    "statut": "realise"
                }
                response = self.session.put(f"{BASE_URL}/budget/{item_id}", json=update_data)
                if response.status_code == 200:
                    updated_item = response.json()
                    # Check EUR conversion for both prevu and realise
                    expected_prevu_eur = round(150000 * 0.00838, 2)
                    expected_realise_eur = round(145000 * 0.00838, 2)
                    actual_prevu_eur = updated_item.get('montant_prevu_eur')
                    actual_realise_eur = updated_item.get('montant_realise_eur')
                    
                    if actual_prevu_eur == expected_prevu_eur and actual_realise_eur == expected_realise_eur:
                        self.log_result("PUT Budget Item", True, f"Updated budget item with correct EUR conversions")
                    else:
                        self.log_result("PUT Budget Item", False, f"EUR conversion incorrect after update")
                else:
                    self.log_result("PUT Budget Item", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("PUT Budget Item", False, f"Exception: {str(e)}")
        
        # 5. GET budget items filtered by year
        try:
            response = self.session.get(f"{BASE_URL}/budget?annee=2026")
            if response.status_code == 200:
                items = response.json()
                all_2026 = all(item.get('annee') == 2026 for item in items)
                if all_2026:
                    self.log_result("GET Budget Items Filtered", True, f"Retrieved {len(items)} budget items for 2026")
                else:
                    self.log_result("GET Budget Items Filtered", False, "Filter not working correctly")
            else:
                self.log_result("GET Budget Items Filtered", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Budget Items Filtered", False, f"Exception: {str(e)}")
    
    def test_report_templates_api(self):
        """Test Report Templates API operations"""
        print("\n=== Testing Report Templates API ===")
        
        # 1. GET all report templates (should return 4 default templates)
        try:
            response = self.session.get(f"{BASE_URL}/report-templates")
            if response.status_code == 200:
                templates = response.json()
                self.log_result("GET Report Templates", True, f"Retrieved {len(templates)} report templates")
                
                # Check for expected default templates
                expected_templates = ["Analyse de l'air respirable", "Contrôle annuel du caisson", "Étalonnage manomètre", "Contrôle soupape de sûreté"]
                template_names = [t.get('nom') for t in templates]
                found_defaults = [name for name in expected_templates if name in template_names]
                if len(found_defaults) >= 4:
                    self.log_result("GET Report Templates - Defaults", True, f"Found {len(found_defaults)} default templates")
                else:
                    self.log_result("GET Report Templates - Defaults", False, f"Only found {len(found_defaults)} default templates")
            else:
                self.log_result("GET Report Templates", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Report Templates", False, f"Exception: {str(e)}")
        
        # 2. POST create new report template
        try:
            template_data = {
                "nom": "Test Report Template",
                "type_controle": "controle_mensuel",
                "description": "Test template for monthly control",
                "champs": [
                    {"nom": "test_field_1", "type": "text", "obligatoire": True},
                    {"nom": "test_field_2", "type": "number", "obligatoire": False}
                ],
                "normes_reference": ["Test Norm 1", "Test Norm 2"],
                "criteres_conformite": [
                    {"parametre": "Test Param", "valeur_max": 100, "unite": "test_unit"}
                ],
                "modele_actif": True
            }
            response = self.session.post(f"{BASE_URL}/report-templates", json=template_data)
            if response.status_code == 200:
                template = response.json()
                template_id = template.get('id')
                self.created_resources['report_templates'].append(template_id)
                self.log_result("POST Report Template", True, f"Created report template with ID: {template_id}")
            else:
                self.log_result("POST Report Template", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST Report Template", False, f"Exception: {str(e)}")
    
    def test_documents_api(self):
        """Test Documents API operations"""
        print("\n=== Testing Documents API ===")
        
        # 1. GET all documents
        try:
            response = self.session.get(f"{BASE_URL}/documents")
            if response.status_code == 200:
                documents = response.json()
                self.log_result("GET Documents", True, f"Retrieved {len(documents)} documents")
            else:
                self.log_result("GET Documents", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Documents", False, f"Exception: {str(e)}")
        
        # 2. POST create document (without file)
        try:
            document_data = {
                "titre": "Test Document",
                "type_document": "rapport",
                "categorie": "Test Category",
                "description": "Test document description",
                "date_document": "2026-01-15",
                "tags": ["test", "document"]
            }
            response = self.session.post(f"{BASE_URL}/documents", json=document_data)
            if response.status_code == 200:
                document = response.json()
                document_id = document.get('id')
                self.created_resources['documents'].append(document_id)
                self.log_result("POST Document", True, f"Created document with ID: {document_id}")
            else:
                self.log_result("POST Document", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST Document", False, f"Exception: {str(e)}")
        
        # 3. POST upload document with file
        try:
            # Create a test file
            import io
            test_file_content = b"This is a test document file content for testing purposes."
            files = {'file': ('test_document.txt', io.BytesIO(test_file_content), 'text/plain')}
            data = {
                'titre': 'Test Uploaded Document',
                'type_document': 'notice',
                'categorie': 'Test Upload'
            }
            response = self.session.post(f"{BASE_URL}/documents/upload", files=files, data=data)
            if response.status_code == 200:
                document = response.json()
                document_id = document.get('id')
                self.created_resources['documents'].append(document_id)
                fichier_url = document.get('fichier_url')
                if fichier_url:
                    self.log_result("POST Upload Document", True, f"Uploaded document with file URL: {fichier_url}")
                else:
                    self.log_result("POST Upload Document", False, "Document created but no file URL returned")
            else:
                self.log_result("POST Upload Document", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST Upload Document", False, f"Exception: {str(e)}")
        
        # 4. GET documents filtered by type
        try:
            response = self.session.get(f"{BASE_URL}/documents?type_document=rapport")
            if response.status_code == 200:
                documents = response.json()
                all_rapport = all(doc.get('type_document') == 'rapport' for doc in documents)
                if all_rapport or len(documents) == 0:
                    self.log_result("GET Documents Filtered", True, f"Retrieved {len(documents)} rapport documents")
                else:
                    self.log_result("GET Documents Filtered", False, "Filter not working correctly")
            else:
                self.log_result("GET Documents Filtered", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Documents Filtered", False, f"Exception: {str(e)}")
    
    def test_contracts_crud(self):
        """Test Maintenance Contracts API CRUD operations"""
        print("\n=== Testing Maintenance Contracts API ===")
        
        # Get a contractor ID for the contract
        contractor_id = None
        if self.created_resources['contractors']:
            contractor_id = self.created_resources['contractors'][0]
        else:
            # Try to get an existing contractor
            try:
                response = self.session.get(f"{BASE_URL}/contractors")
                if response.status_code == 200:
                    contractors = response.json()
                    if contractors:
                        contractor_id = contractors[0].get('id')
            except:
                pass
        
        if not contractor_id:
            self.log_result("Contracts Tests", False, "No contractor available for contract tests")
            return
        
        # 1. GET all contracts
        try:
            response = self.session.get(f"{BASE_URL}/contracts")
            if response.status_code == 200:
                contracts = response.json()
                self.log_result("GET Contracts", True, f"Retrieved {len(contracts)} contracts")
            else:
                self.log_result("GET Contracts", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Contracts", False, f"Exception: {str(e)}")
        
        # 2. POST create new contract
        try:
            contract_data = {
                "numero_contrat": "TEST-CONTRACT-001",
                "titre": "Test Maintenance Contract",
                "contractor_id": contractor_id,
                "type_contrat": "maintenance",
                "date_debut": "2026-01-01",
                "date_fin": "2026-12-31",
                "montant_annuel": 500000,
                "devise": "XPF",
                "periodicite_facturation": "trimestriel",
                "prestations_incluses": ["Maintenance préventive", "Dépannage"],
                "statut": "actif"
            }
            response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
            if response.status_code == 200:
                contract = response.json()
                contract_id = contract.get('id')
                self.created_resources['contracts'].append(contract_id)
                self.log_result("POST Contract", True, f"Created contract with ID: {contract_id}")
            else:
                self.log_result("POST Contract", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST Contract", False, f"Exception: {str(e)}")
        
        # 3. GET single contract
        if self.created_resources['contracts']:
            try:
                contract_id = self.created_resources['contracts'][0]
                response = self.session.get(f"{BASE_URL}/contracts/{contract_id}")
                if response.status_code == 200:
                    contract = response.json()
                    self.log_result("GET Single Contract", True, f"Retrieved contract: {contract.get('titre')}")
                else:
                    self.log_result("GET Single Contract", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("GET Single Contract", False, f"Exception: {str(e)}")
        
        # 4. PUT update contract
        if self.created_resources['contracts']:
            try:
                contract_id = self.created_resources['contracts'][0]
                update_data = {
                    "numero_contrat": "TEST-CONTRACT-001-UPDATED",
                    "titre": "Updated Test Maintenance Contract",
                    "contractor_id": contractor_id,
                    "type_contrat": "maintenance",
                    "date_debut": "2026-01-01",
                    "date_fin": "2027-12-31",
                    "montant_annuel": 600000,
                    "statut": "actif"
                }
                response = self.session.put(f"{BASE_URL}/contracts/{contract_id}", json=update_data)
                if response.status_code == 200:
                    self.log_result("PUT Contract", True, f"Updated contract {contract_id}")
                else:
                    self.log_result("PUT Contract", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("PUT Contract", False, f"Exception: {str(e)}")
    
    def test_import_api(self):
        """Test Import API operations"""
        print("\n=== Testing Import API ===")
        
        # Test initialize default data
        try:
            response = self.session.post(f"{BASE_URL}/init/default-data")
            if response.status_code == 200:
                result = response.json()
                contractors_count = result.get('results', {}).get('contractors', 0)
                templates_count = result.get('results', {}).get('templates', 0)
                self.log_result("POST Init Default Data", True, f"Initialized {contractors_count} contractors and {templates_count} templates")
            else:
                self.log_result("POST Init Default Data", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST Init Default Data", False, f"Exception: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n=== Cleaning up test data ===")
        
        # Delete created documents
        for doc_id in self.created_resources['documents']:
            try:
                response = self.session.delete(f"{BASE_URL}/documents/{doc_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted document: {doc_id}")
            except:
                pass
        
        # Delete created contracts
        for contract_id in self.created_resources['contracts']:
            try:
                response = self.session.delete(f"{BASE_URL}/contracts/{contract_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted contract: {contract_id}")
            except:
                pass
        
        # Delete created budget items
        for item_id in self.created_resources['budget_items']:
            try:
                response = self.session.delete(f"{BASE_URL}/budget/{item_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted budget item: {item_id}")
            except:
                pass
        
        # Delete created gas cylinders
        for cylinder_id in self.created_resources['gas_cylinders']:
            try:
                response = self.session.delete(f"{BASE_URL}/gas-cylinders/{cylinder_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted gas cylinder: {cylinder_id}")
            except:
                pass
        
        # Delete created contractors
        for contractor_id in self.created_resources['contractors']:
            try:
                response = self.session.delete(f"{BASE_URL}/contractors/{contractor_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted contractor: {contractor_id}")
            except:
                pass
        
        # Delete created interventions
        for intervention_id in self.created_resources['interventions']:
            try:
                response = self.session.delete(f"{BASE_URL}/interventions/{intervention_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted intervention: {intervention_id}")
            except:
                pass
        
        # Delete created sub-equipments
        for subequip_id in self.created_resources['subequipments']:
            try:
                response = self.session.delete(f"{BASE_URL}/subequipments/{subequip_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted sub-equipment: {subequip_id}")
            except:
                pass
        
        # Delete created work orders
        for wo_id in self.created_resources['work_orders']:
            try:
                response = self.session.delete(f"{BASE_URL}/work-orders/{wo_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted work order: {wo_id}")
            except:
                pass
        
        # Delete created inspections
        for insp_id in self.created_resources['inspections']:
            try:
                response = self.session.delete(f"{BASE_URL}/inspections/{insp_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted inspection: {insp_id}")
            except:
                pass
        
        # Delete created equipments
        for eq_id in self.created_resources['equipments']:
            try:
                response = self.session.delete(f"{BASE_URL}/equipments/{eq_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted equipment: {eq_id}")
            except:
                pass
        
        # Delete created equipment types
        for type_id in self.created_resources['equipment_types']:
            try:
                response = self.session.delete(f"{BASE_URL}/equipment-types/{type_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted equipment type: {type_id}")
            except:
                pass
        
        # Note: We don't delete report_templates as they might be default templates
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting HyperMaint GMAO Backend API Tests")
        print(f"🔗 Testing against: {BASE_URL}")
        print(f"👤 Authentication: {AUTH_EMAIL}")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run all test suites - OLD FEATURES
        print("\n" + "=" * 60)
        print("TESTING OLD FEATURES (Previously Implemented)")
        print("=" * 60)
        self.test_equipment_types_crud()
        self.test_subequipments_crud()
        self.test_interventions_curative_preventive()
        self.test_dashboard_stats_compressors()
        self.test_export_endpoints()
        self.test_work_order_delete()
        
        # Run all test suites - NEW FEATURES
        print("\n" + "=" * 60)
        print("TESTING NEW FEATURES (Phase 1 Implementation)")
        print("=" * 60)
        self.test_contractors_crud()
        self.test_gas_cylinders_crud()
        self.test_budget_api()
        self.test_report_templates_api()
        self.test_documents_api()
        self.test_contracts_crud()
        self.test_import_api()
        
        # Clean up
        self.cleanup_test_data()
        
        # Summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result['status'])
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result['status'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result['status']:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n✅ PASSED TESTS:")
        for result in self.test_results:
            if "✅ PASS" in result['status']:
                print(f"  - {result['test']}: {result['message']}")

if __name__ == "__main__":
    tester = HyperMaintTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
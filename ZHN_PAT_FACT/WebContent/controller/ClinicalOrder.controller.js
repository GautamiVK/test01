jQuery.sap.require("sap.ui.core.mvc.Controller");
jQuery.sap.require("com.ril.hn.emrpatient.util.Formatter");

sap.ui.core.mvc.Controller.extend("com.ril.hn.emrpatient.controller.ClinicalOrder", {
	oDefaultParams: {
        sEntityPath: "",
        sFilterPath: "",
        bAllergyRefreshRequired: true
    },
    
	onInit : function() {
		thatCO = this;

		this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView()));
		thatCO.i18n =  this._oComponent.getModel("i18n").getResourceBundle();

		this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
		this._oRouter.attachRoutePatternMatched(this._onRoutePatternMatched, this);
	},

	_onRoutePatternMatched : function(oEvent) {
		// if not this page then return
		if (oEvent.getParameter("name") !== "PatientsClinicalOrder") {
			return;
		}
		 ga("send", "pageview", "ClinicalOVPhysician/ClinicalOrder");
		 
		// if this page then initialize the screen
		thatCO = this ;
		var patientHeaderModel = sap.ui.getCore().getModel("PatientHeaderModel");
		
		if(patientHeaderModel == undefined){
			
			thatCO._oRouter.navTo("PatientOverview", {} , false );
			
		}else{
			
			thatCO.oModel =  this.getView().getModel("EMR_SRV");

			thatCO.getView().setModel(patientHeaderModel , "PatientHeader");
			thatCO.getView().bindElement("PatientHeader>/Patient/0");
			
			thatCO.casesAndTimeIntervalsModel = sap.ui.getCore().getModel("CasesAndTimeIntervalsDrModel");
			thatCO.selectedCasesAndTimeIntervalsModel = sap.ui.getCore().getModel("SelectedCasesAndTimeIntervalsDrModel");
			
			thatCO.oDefaultParams.sEntityPath =  "/" + oEvent.getParameters().arguments.entity;
			
			if (thatCO.selectedCasesAndTimeIntervalsModel)
				thatCO.oDefaultParams.sFilterPath = ("?$filter=TimeInterval eq'" + thatCO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Id + "'").replace(" ", "%20");
	        else
	        	thatCO.oDefaultParams.sFilterPath = "";
        	thatCO._initFSClinicalOrder();
        	thatCO.initConfigData();
		}
	},
	
	initConfigData: function() {
		thatCO.getView().setModel(sap.ui.getCore().getModel("ConfigModel"), "Config");
		thatCO.getView().bindElement("Config>/ConfigData/0");
    },
	
	onNavBack : function(){
		window.history.go(-1);
	},
	
	
	_initFSClinicalOrder : function(entity,filter){
		//get clinical order data and initialise the table - consider filter while getting the data
		com.ril.hn.emrpatient.util.Utility.onBusyIndicatorOpen(thatCO);
		thatCO.oFSClinicalOrder = new sap.ui.model.json.JSONModel({"FSClinicalOrder" : []  });
		var sPath = thatCO.oDefaultParams.sEntityPath + "/MedicalRequests" + thatCO.oDefaultParams.sFilterPath ;
		com.ril.hn.emrpatient.util.DataManager.readData(sPath,thatCO.oModel, null, null, null, thatCO.onFSClinicalOrderReadSuccess, thatCO.onFSClinicalOrderReadError);
	},
	
	onFSClinicalOrderReadSuccess : function(oData, oResponse, oRefData) {
		thatCO.oFSClinicalOrder.getData().FSClinicalOrderData = oData.results ;
		thatCO._initClinicalOrderPanel();
	    },

	    onFSClinicalOrderReadError : function(oData, oResponse, oRefData) {
	    	 thatCO.oFSClinicalOrder.getData().FSClinicalOrderData = [] ;
			    thatCO._initClinicalOrderPanel();
	        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
	    },
	

	_initClinicalOrderPanel  : function() {
		//set data to table , set selected time interval in header , filter table records with status key
		com.ril.hn.emrpatient.util.UiControlManager.initTableControl(thatCO,thatCO.getView().byId("ID_PAT_DASH_CLINICAL_ORDER_FS_TABL"), thatCO.getFSClinicalOrderTemplate(),thatCO.oFSClinicalOrder, "FSClinicalOrderData");
	    thatCO.getView().byId("ID_PAT_DASH_OBJ_HEADER_CLINICAL_ORDER_TIME_FILTER").setText(thatCO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Label);
		
		thatCO.getView().byId("ID_PAT_DASH_CLINICAL_ORDER_FS_FILTER").setSelectedKey("");
		var oFilter  = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, "");
		var oBinding = thatCO.getView().byId("ID_PAT_DASH_CLINICAL_ORDER_FS_TABL").getBinding("items");
	    oBinding.filter([oFilter]);	
	    
	    com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(thatCO);
		},
		
		getFSClinicalOrderTemplate : function(){
			var oTempl =new sap.m.ColumnListItem({
				cells : [
				         new sap.m.ObjectIdentifier({
				        	 title : "{Title}",
				        	 text : thatCO.i18n.getText("TXT_CO_DEPARTMENT") + " : {path : 'Department' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getI18nText'}",
				        	 wrapping: true
				        	 }),
				        	 new sap.m.ObjectStatus({
					        	 text : "{Status}",
					        	 state : "{path: 'Status', formatter: 'com.ril.hn.emrpatient.util.Formatter.getClinicalOrderStatus'}",
				        		 wrapping: true
					        	 }),
				        	 new sap.m.Label({
				        		 text : "{ path: 'CreationTimestamp',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other'}",
				        		 design : "Bold",
				        		 wrapping: true
				        	 })]

			});
	        return oTempl;
		},
		
		onCaseAndTimeIntervalsPressed : function(oEvent){
			ga( "send" , "event" , "ClinicalOVPhysician/ClinicalOrder/CseNTymIntDiag", "clicked");
			com.ril.hn.emrpatient.util.CaseAndTimeIntervalManager.onOpenCaseAndTimeIntervalDialog(thatCO,thatCO.casesAndTimeIntervalsModel,thatCO.oDefaultParams.sEntityPath,thatCO.oModel,thatCO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.SelectedIndex,thatCO.handleCasesAndTimeIntervalsClose);
			
		},
		
		handleCasesAndTimeIntervalsClose : function(oEvent){
			 var oSelectedItem = oEvent.getParameter("selectedItem");
		        if (oSelectedItem) {
		        	ga( "send" , "event" , "ClinicalOVPhysician/ClinicalOrder/CseNTymIntSel", "clicked");
		        	
		        	// get case id and time intervals and refresh the ui
		        	var context = oSelectedItem.getBindingContext() ;
		        	var object = context.getObject(context.sPath) ;
		        	oSelectedItem.setSelected(true);
		        	
		        	thatCO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData = object ; 
		        	thatCO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData['SelectedIndex'] = context.sPath.split("/")[2];
		        	
		        	thatCO.oDefaultParams.sFilterPath = ("?$filter=TimeInterval eq'" + object.Id + "'").replace(" ", "%20") ;
		        	
					thatCO._initFSClinicalOrder();
		        	thatCO.getView().byId("ID_PAT_DASH_OBJ_HEADER_CLINICAL_ORDER_TIME_FILTER").setText(object.Label);
					
		        }

		},
		
		
		handleClinicalOrderFilter : function(oEvent){
			//filter data according to status , two operators = & Contains used to filter for all & avoid same spelling keys
			var creatorProfession = oEvent.getSource().getSelectedKey();
			var oFilter ="";
	   		if(creatorProfession == ""){
	   			oFilter  = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, "");
			}else {
	   		 	oFilter  = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, creatorProfession);
	   		}
			var oBinding = thatCO.getView().byId("ID_PAT_DASH_CLINICAL_ORDER_FS_TABL").getBinding("items");
	        oBinding.filter([oFilter]);	
		} ,
		
		
		handleCreateClinicalOrderFSPressed : function(){
			 ga( "send" , "event" , "ClinicalOVPhysician/ClinicalOrder/COCreTrans", "clicked");
			/* var patient = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
		        com.ril.hn.emrpatient.util.OrderManager.onCreateClinicalOrder(patient, thatCO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData);
		       */ 
			 	var caseNo="";
			 	sap.ui.getCore().getModel("RefreshScreenModel").getData().Refresh = true ;
				if(thatCO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId !== ""){
					caseNo = thatCO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId;
				}else{
					caseNo = thatCO.casesAndTimeIntervalsModel.getData().CasesAndTimeIntervalsData[0].CaseId;
				}
				 var pat = that.getView().getModel("PatientHeader").getData().Patient[0];
				var risk = pat.Attention;
				var navigationService = sap.ushell.Container.getService("CrossApplicationNavigation");
				navigationService.toExternal({
					target : { 
						shellHash: "#ZHN-ClinicalOrderDoc?Patient="+pat.ExternalPatientId+"&Case="+caseNo+"&PatientName="+pat.NameLabel+"&Sex="+pat.Gender+"&Birthdate="+new Date(pat.Birthdate.replace(/-/g, "/")).getTime()+
			        "&DeptOu="+pat.ThirdLine.split(" ")[0]+"&TreatOu="+pat.WardId+"&AttPhy="+pat.AttendingPhy+"&AttPhyNo="+pat.AttendingPhyNo+"&MovDate="+pat.DateOfAdmission.getTime()+"&AdmPhy="+pat.AdmittingPhy+"&AdmPhyNo="+pat.AdmittingPhyNo+"&room="+pat.CurrentLocation.split(" ")[2]+"&Bed="+pat.CurrentLocation.split(" ")[3]+"&riskFactor="+risk+"&AllergyStatus=&/Clinical Order Overview"
					}
				});
		
		},
		     
		        handleSettingsClinicalOrderFSPressed : function(){
		        	ga( "send" , "event" , "ClinicalOVPhysician/ClinicalOrder/COSortDiag", "clicked");
		        	//open sort dialog
		        	com.ril.hn.emrpatient.util.Utility.onDialogOpen(this,"viewsetting.ClinicalOrderVS","ClinicalOrderVS");
		        },
		        
		        
		        handleCOSettingsConfirm : function(oEvent){
		        	ga( "send" , "event" , "ClinicalOVPhysician/ClinicalOrder/COSortOk", "clicked");
		        	com.ril.hn.emrpatient.util.Utility.onSortItems(this,"ID_PAT_DASH_CLINICAL_ORDER_FS_TABL",oEvent);
		        }
	
});
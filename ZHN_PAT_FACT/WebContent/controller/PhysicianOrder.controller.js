jQuery.sap.require("sap.ui.core.mvc.Controller");
jQuery.sap.require("com.ril.hn.emrpatient.util.Formatter");

sap.ui.core.mvc.Controller.extend("com.ril.hn.emrpatient.controller.PhysicianOrder", {
	oDefaultParams: {
        sEntityPath: "",
        sFilterPath: "",
        bAllergyRefreshRequired: true
    },
    
	onInit : function() {
		
		//ga('send', 'emrpatientNurse');
		//ga('send', 'pageview','/emrpatientDoctor/PhysicianOrder_View');
		
		thatPO = this;

		this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView()));
		thatPO.i18n =  this._oComponent.getModel("i18n").getResourceBundle();

		this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
		this._oRouter.attachRoutePatternMatched(this._onRoutePatternMatched, this);
	},

	_onRoutePatternMatched : function(oEvent) {
		// if not this page then return
		if (oEvent.getParameter("name") !== "PatientsPhysicianOrder") {
			return;
		}
		
		 ga("send", "pageview", "ClinicalOVPhysician/PhysicianOrder");
		 
		// if this page then initialize the screen
		thatPO = this ;
		var patientHeaderModel = sap.ui.getCore().getModel("PatientHeaderModel");
		
		if(patientHeaderModel == undefined){
			
			thatPO._oRouter.navTo("PatientOverview", {} , false );
			
		}else{
			thatPO.oModel = this.getView().getModel("EMR_SRV");

			thatPO.getView().setModel(patientHeaderModel , "PatientHeader");
			thatPO.getView().bindElement("PatientHeader>/Patient/0");

			thatPO.oDefaultParams.sEntityPath = "/" + oEvent.getParameters().arguments.entity;
			thatPO.filterType =  oEvent.getParameters().arguments.filter;
			thatPO.filterType = (thatPO.filterType !== "All") ? thatPO.filterType : "";
			
			thatPO.casesAndTimeIntervalsModel = sap.ui.getCore().getModel("CasesAndTimeIntervalsDrModel");
			thatPO.selectedCasesAndTimeIntervalsModel = sap.ui.getCore().getModel("SelectedCasesAndTimeIntervalsDrModel");
			
			if (thatPO.selectedCasesAndTimeIntervalsModel)
				thatPO.oDefaultParams.sFilterPath = ("?$filter=TimeInterval eq'" + thatPO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Id + "'").replace(" ", "%20");
	        else
	        	thatPO.oDefaultParams.sFilterPath = "";
			
			thatPO._initFSPhysicianOrder();
		}
		
	},
	
	
	onNavBack : function(){
		com.ril.hn.emrpatient.util.Utility.onDestroyFragment(thatPO, "CreatePhysicianOrder");
		window.history.go(-1);
	},
	
	
	_initFSPhysicianOrder : function(entity,filter){
		com.ril.hn.emrpatient.util.Utility.onBusyIndicatorOpen(thatPO);
		thatPO.oFSPhysicianOrder = new sap.ui.model.json.JSONModel({"FSPhysicianOrder" : []  });
		var sPath = thatPO.oDefaultParams.sEntityPath + "/Todos" + thatPO.oDefaultParams.sFilterPath ;
		com.ril.hn.emrpatient.util.DataManager.readData(sPath,thatPO.oModel, null, null, null, thatPO.onFSPhysicianOrderReadSuccess, thatPO.onFSPhysicianOrderReadError);
	
	},
	
	
	onFSPhysicianOrderReadSuccess : function(oData, oResponse, oRefData) {
		thatPO.oFSPhysicianOrder.getData().FSPhysicianOrderData = oData.results ;
		thatPO._initPhysicianOrderPanel();
	    },

	    onFSPhysicianOrderReadError : function(oData, oResponse, oRefData) {
	    	 thatPO.oFSPhysicianOrder.getData().FSPhysicianOrderData = [] ;
			    thatPO._initPhysicianOrderPanel();
	        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
	    },
	

	_initPhysicianOrderPanel  : function() {
		
		com.ril.hn.emrpatient.util.UiControlManager.initTableControl(thatPO,thatPO.getView().byId("ID_PAT_DASH_CLINICAL_TASK_FS_TABL"), thatPO.getFSPhysicianOrderTemplate(),thatPO.oFSPhysicianOrder, "FSPhysicianOrderData");
		thatPO.getView().byId("ID_PAT_DASH_OBJ_HEADER_PHYSICIAN_ORDER_TIME_FILTER").setText(thatPO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Label);
		
		thatPO.getView().byId("ID_PAT_DASH_CLINICAL_TASK_FS_FILTER").setSelectedKey(thatPO.filterType);
		var oFilter  = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains,thatPO.filterType);
		var oBinding = thatPO.getView().byId("ID_PAT_DASH_CLINICAL_TASK_FS_TABL").getBinding("items");
	    oBinding.filter([oFilter]);	
	    
	    com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(thatPO);
		},
		
		getFSPhysicianOrderTemplate : function(){
			var oTempl =new sap.m.ColumnListItem({
				cells : [
				         new sap.m.ObjectIdentifier({
			        	 title : "{Text}",
			        	 text : "{CreatorName}",
			        	 wrapping: true
			        	 }),
			        	 new sap.m.ObjectStatus({
				        	 text : "{Status}",
				        	 state : "{path: 'Status', formatter: 'com.ril.hn.emrpatient.util.Formatter.getClinicalTaskStatus'}",
			        		 wrapping: true
				        	 }),
			        	 new sap.m.Label({
			        		 text : "{ path: 'CreatedOn',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other'}",
			        		 design : "Bold",
			        		 wrapping: true
			        	 })]

			});
	        return oTempl;
		},
		
		onCaseAndTimeIntervalsPressed : function(oEvent){
			ga( "send" , "event" , "ClinicalOVPhysician/PhysicianOrder/CseNTymIntDiag", "clicked");
			com.ril.hn.emrpatient.util.CaseAndTimeIntervalManager.onOpenCaseAndTimeIntervalDialog(thatPO,thatPO.casesAndTimeIntervalsModel,thatPO.oDefaultParams.sEntityPath,thatPO.oModel,thatPO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.SelectedIndex,thatPO.handleCasesAndTimeIntervalsClose);
			
		},
		
		handleCasesAndTimeIntervalsClose : function(oEvent){
			 var oSelectedItem = oEvent.getParameter("selectedItem");
		        if (oSelectedItem) {
		        	ga( "send" , "event" , "ClinicalOVPhysician/ClinicalOrder/CseNTymIntSel", "clicked");
		        	
		        	// get case id and time intervals and refresh the ui
		        	var context = oSelectedItem.getBindingContext() ;
		        	var object = context.getObject(context.sPath) ;
		        	oSelectedItem.setSelected(true);
		        	
		        	thatPO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData = object ; 
		        	thatPO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData['SelectedIndex'] = context.sPath.split("/")[2];
		        	
					thatPO.oDefaultParams.sFilterPath = ("?$filter=TimeInterval eq'" + object.Id + "'").replace(" ", "%20") ;
		        	
					thatPO._initFSPhysicianOrder();
		        	thatPO.getView().byId("ID_PAT_DASH_OBJ_HEADER_PHYSICIAN_ORDER_TIME_FILTER").setText(object.Label);
				}

		},
		
		
		handlePhysicianOrderFilter : function(oEvent){
			ga( "send" , "event" , "ClinicalOVPhysician/PhysicianOrder/POStatFiltr", "clicked");
			
			var creatorProfession = oEvent.getSource().getSelectedKey();
			thatPO.filterType = creatorProfession ;
			var oFilter ="";
	   		if(creatorProfession == ""){
	   			oFilter  = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, "");
			}else {
	   		 	oFilter  = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, creatorProfession);
	   		}
			var oBinding = thatPO.getView().byId("ID_PAT_DASH_CLINICAL_TASK_FS_TABL").getBinding("items");
	        oBinding.filter([oFilter]);	
		} ,
		
		
		handleCreatePhysicianOrder : function(){
			ga( "send" , "event" , "ClinicalOVPhysician/PhysicianOrder/POCreDiag", "clicked");
			com.ril.hn.emrpatient.util.Utility.onDialogOpen(thatPO, "fragment.CreatePhysicianOrder", "CreatePhysicianOrder");
	        sap.ui.getCore().byId("ID_PHYSICIAN_ORDER_CATEGORY").setValue("");
	        sap.ui.getCore().byId("ID_PHYSICIAN_ORDER_TEXT").setValue("");
		},
		
		
		/*On save check all mandatory fields , 
		 * if yes send progress note to backend */
		handlePhysicianOrderSaveButton : function(){
			ga( "send" , "event" , "ClinicalOVPhysician/PhysicianOrder/POSave", "clicked");
	        
	        var physicianOrderCategory = sap.ui.getCore().byId("ID_PHYSICIAN_ORDER_CATEGORY").getValue();
	        var physicianOrderText = sap.ui.getCore().byId("ID_PHYSICIAN_ORDER_TEXT").getValue();

	        if (physicianOrderCategory == "") {
	            com.ril.hn.emrpatient.util.Utility.displayError(thatPO.i18n.getText("TXT_CATEGORY_MANDATORY"), "ERROR", "Alert");
	            return false;
	        }
	        if (physicianOrderText == "") {
	            com.ril.hn.emrpatient.util.Utility.displayError(thatPO.i18n.getText("TXT_COMMENT_MANDATORY"), "ERROR", "Alert");
	            return false;
	        }

	        var data;
	        data = {
	            CategoryId: thatPO.selectedFSPhysicianOrderCatLabel,
	            Text: physicianOrderText
	        };

	        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/POSave", "clicked");

	        var sPath = thatPO.oDefaultParams.sEntityPath + "/Todos";

	        com.ril.hn.emrpatient.util.DataManager.createData(sPath, thatPO.oModel, null, null, data, null, function(oData, oResponse, oRefData) {
	            sap.m.MessageToast.show(thatPO.i18n.getText("TXT_CT_SAVED"));
	            sPath = sPath + thatPO.oDefaultParams.sFilterPath;
	            com.ril.hn.emrpatient.util.DataManager.readData(sPath, thatPO.oModel, null, null, null, thatPO.onFSPhysicianOrderReadSuccess, thatPO.onFSPhysicianOrderReadError);
	            com.ril.hn.emrpatient.util.Utility.onDialogClose(thatPO, "CreatePhysicianOrder");
	        }, function(oData, oResponse, oRefData) {
	            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
	        });
		},
		
		
		//Initialise and open progress notes value help dialog
		handleValueHelpPhysicianOrderCategory : function(oEvent) {
			ga( "send" , "event" , "ClinicalOVPhysician/PhysicianOrder/POCatDiag", "clicked");
			var oItem = {
		            Title: "{Name}",
		            Description: "{Id}"
		        };
		        if (!thatPO.oFSPhysicianOrderCat || thatPO.oFSPhysicianOrderCat.getData().FSPhysicianOrderCatData.length == 0) {
		            thatPO.oFSPhysicianOrderCat = new sap.ui.model.json.JSONModel({
		                "FSPhysicianOrderCatData": []
		            });
		            com.ril.hn.emrpatient.util.DataManager.readData("/TodoCategoryCollection", thatPO.oModel, null, null, null, function(oData, oResponse, oRefData) {
		                thatPO.oFSPhysicianOrderCat.getData().FSPhysicianOrderCatData = oData.results;
		                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(thatPO, "vhFSPhysicianOrderCat", "Category", "/FSPhysicianOrderCatData", oItem, thatPO.vhFSPhysicianOrderCatSearch, thatPO.vhFSPhysicianOrderCatClose);
		                vh.setModel(thatPO.oFSPhysicianOrderCat);
		                vh.open();
		            }, function(oData, oResponse, oRefData) {
		                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
		            });
		        } else {
		            if (thatPO.oFSPhysicianOrderCat.getData().FSPhysicianOrderCatData.length) {
		                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(thatPO, "vhFSPhysicianOrderCat", "Category", "/FSPhysicianOrderCatData", oItem, thatPO.vhFSPhysicianOrderCatSearch, thatPO.vhFSPhysicianOrderCatClose);
		                vh.setModel(thatPO.oPhysicianOrderCat);
		                vh.open();
		            }
		        }
		},
		
		
		//close progress notes value help dialog and show selected category
		vhFSPhysicianOrderCatClose  : function(oEvent) {
		        var oSelectedItem = oEvent.getParameter("selectedItem");
		        if (oSelectedItem) {
		        	ga( "send" , "event" , "ClinicalOVPhysician/PhysicianOrder/POCatSel", "clicked");
		        	
		        	var physicianOrderCatTitle = oSelectedItem.getTitle();
		            thatPO.selectedFSPhysicianOrderCatLabel = oSelectedItem.getDescription();
		            var physicianOrderCategory = sap.ui.getCore().byId("ID_PHYSICIAN_ORDER_CATEGORY");
		            physicianOrderCategory.setValue(physicianOrderCatTitle);
		        }
		},

		
		//Value help searching
		vhFSPhysicianOrderCatSearch  : function(evt) {
		       var sValue = evt.getParameter("value");
		       var oNameFilter = new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sValue);
		       evt.getSource().getBinding("items").filter([oNameFilter]);	
		},
		
		handleSettingsPhysicianOrder : function(){
			ga( "send" , "event" , "ClinicalOVPhysician/PhysicianOrder/POSortDiag", "clicked");
			com.ril.hn.emrpatient.util.Utility.onDialogOpen(this,"viewsetting.PhysicianOrderVS","PhysicianOrderVS");
		},
		
		handlePOSettingsConfirm : function(oEvent){
			ga( "send" , "event" , "ClinicalOVPhysician/PhysicianOrder/POSortOk", "clicked");
			com.ril.hn.emrpatient.util.Utility.onSortItems(this,"ID_PAT_DASH_CLINICAL_TASK_FS_TABL",oEvent);
		},
		
		 onDialogClose: function(oEvent) {
		        var sType = "";
		        if (typeof oEvent == "object") {
		            sType = oEvent.getSource().data("dialogType");
		        } else if (typeof oEvent == "string") {
		            sType = oEvent;
		        }
		        this[sType].close();
		    },

		
	
});
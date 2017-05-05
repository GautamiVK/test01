jQuery.sap.require("sap.ui.core.mvc.Controller");
jQuery.sap.require("com.ril.hn.emrpatient.util.Formatter");

sap.ui.core.mvc.Controller.extend("com.ril.hn.emrpatient.controller.ActiveMedication", {

	oDefaultParams: {
        sEntityPath: "",
        sFilterPath: "",
        bAllergyRefreshRequired: true
    },
    
    
	onInit : function() {
		
		//ga('send', 'emrpatientNurse');
		//ga('send', 'pageview','/emrpatientDoctor/ServiceOrder_View');
		
		thatMed = this ;
		this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView()));
		thatMed.i18n =  this._oComponent.getModel("i18n").getResourceBundle();

		this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
		this._oRouter.attachRoutePatternMatched(this._onRoutePatternMatched, this);
	},

	_onRoutePatternMatched : function(oEvent) {
		// if not this page then return
		if (oEvent.getParameter("name") !== "PatientsActiveMedication") {
			return;
		}
		ga("send", "pageview", "ClinicalOVPhysician/Medications");
		 
		// if this page then initialize the screen
		thatMed = this ;
		var patientHeaderModel = sap.ui.getCore().getModel("PatientHeaderModel");
		
		if(patientHeaderModel == undefined){
			thatMed._oRouter.navTo("PatientOverview", {} , false );
		}else{
			
			thatMed.oModel = this.getView().getModel("EMR_SRV");
			
			//odata for treatment sheet and active medication
			thatMed.oModelScored = this.getView().getModel("SCORES_SRV");
			
			thatMed.getView().setModel(patientHeaderModel , "PatientHeader");
			thatMed.getView().bindElement("PatientHeader>/Patient/0");

			thatMed.oDefaultParams.sEntityPath = "/" + oEvent.getParameters().arguments.entity;
			thatMed.casesAndTimeIntervalsModel = sap.ui.getCore().getModel("CasesAndTimeIntervalsDrModel");
			thatMed.selectedCasesAndTimeIntervalsModel = sap.ui.getCore().getModel("SelectedCasesAndTimeIntervalsDrModel");
			
			thatMed.getView().byId("ID_PAT_DASH_MEDIC_OBJ_HEADER_TIME_FILTER").setText(thatMed.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Label);
			
			thatMed.getView().byId("ID_PAT_DASH_MEDIC_HISTORY").setVisible(true);
        	thatMed.getView().byId("ID_PAT_DASH_MEDIC_ACTIVEMEDIC").setVisible(false);
    		
        	thatMed.getDisplayFilter();
        	thatMed.onMedHistOrActMed("ActiveMedication");
        	thatMed.initConfigData();
		}
	},
	
	initConfigData: function() {
		thatMed.getView().setModel(sap.ui.getCore().getModel("ConfigModel"), "Config");
		thatMed.getView().bindElement("Config>/ConfigData/0");
    },
    
	onNavBack : function(){
		window.history.go(-1);
	},
	
	getDisplayFilter : function(){
		var sPath = "/FilterSet";
		thatMed.filterContent = new sap.m.List({
			mode : "MultiSelect",
			includeItemInSelection : true,
			selectionChange : thatMed.onFilterSelectionChange,
			items : {
				path : sPath,
				template : new sap.m.StandardListItem({
					title : "{OrderTypeDesc}"
				})
			}
		});
		thatMed.filterPopup= new sap.m.Popover({ //popUp
			showHeader : false,
			width : "20%",
			class : "sapUiSizeCompact",
			placement : "Bottom",
			content : thatMed.filterContent
		});
	},
	
	prepareMedicationTable : function(type){
		com.ril.hn.emrpatient.util.UiControlManager.initTableControl(thatMed,thatMed.getView().byId("ID_PAT_DASH_MEDIC_DATA_TABLE"), thatMed.getFSActiveMedicationOrderTemplate(),thatMed.oMedication, "MedicationData");
		thatMed.applyGrpFilSrt(type);
	},
	
	
	getFSActiveMedicationOrderTemplate : function(){
		var oTempl = new sap.m.ColumnListItem({
			cells : [new sap.m.Text({
			        	 text : "{OrderTypeDesc}",
			        	 wrapping: true
			         }),
			         new sap.m.ObjectStatus({
			        	 text : "{DrugDesc}",
			        	 state : "{path : 'Cycle',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getMedStatusColor'}",
			        	 wrapping: true
			         }),  new sap.m.Text({
			        	 text : "{OrderStatus}",
			        	 wrapping: true
			         }),
			         new sap.m.Text({
			        	 text : "{path : 'FromDate',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDate'}",
			        	 wrapping: true
			         }),
			         new sap.m.Text({
			        	 text : "{path : 'ToDate',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDate'}",
			        	 wrapping: true
			         }),
			         new sap.m.Text({
			        	 text : "{Duration}",
			        	 wrapping: true
			         }),
			         new sap.ui.core.Icon({
		        		 src : "sap-icon://timesheet",
		        		 visible : "{path : 'Prn',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getMedIconVisible'}",
		        		 size : "1.2rem",
			        	 wrapping: true
		        	 }),
			         new sap.m.Text({
			        	 text : "{parts: [{path : 'Comment'},{path : 'PrnComment'}] , formatter : 'com.ril.hn.emrpatient.util.Formatter.getFormattedComments'}",
			        	 wrapping: true
			         })]
		});
        return oTempl;
	},
	
	getGroupHeader: function (oGroup){
		return new sap.m.GroupHeaderListItem( {
			title: oGroup.key,
			upperCase: false
		} );
	},
	
	/* on press of navigation button */
	onNavBack: function() {	
		window.history.go(-1);
	},

	
	getFilterItems : function(arr){
		var items = [];
		for (var i = 0; i < arr.length; i++) {
    		var flag = false;
    		for(var j = i+1; j < arr.length; j++ ){
    			if(arr[i].OrderTypeDesc == arr[j].OrderTypeDesc ) {
    				flag = true;
    			}
    		}
    		if(!flag){
    			items.push({"OrderTypeDesc" : arr[i].OrderTypeDesc});
    		}
		} 
		for (var k = 0; k < items.length; k++) {
    		if(items[k].OrderTypeDesc == "Inpatient"){
    			var temp = items[0];
    			items[0] = items[k];
    			items[k] = temp;
    			break;
    		}
		} 
		return items;
	},
	
	
	onMedHistOrActMed : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/Medications/ActMedOrMedHist", "clicked");
		com.ril.hn.emrpatient.util.Utility.onBusyIndicatorOpen(thatMed);
		var sPath = "" , type = "";
		if(typeof oEvent == "object")
			type = oEvent.getSource().getCustomData()[0].getValue();
		else
			type = oEvent ;
		if(type === "MedicationHistory"){
			thatMed.getView().byId("ID_PAT_DASH_MEDIC_HISTORY").setVisible(false);
			thatMed.getView().byId("ID_PAT_DASH_MEDIC_ACTIVEMEDIC").setVisible(true);
			thatMed.getView().byId("ID_PAT_DASH_MEDIC_TITLE").setText("Medication history");
			thatMed.getView().byId("ID_PAT_DASH_MEDIC_DATA_BY_DATE_DATEPICKER").setDateValue(new Date(new Date().getTime() - (24*60*60*1000)));
			sPath = "ActiveMedicationSet?$filter= Case eq '" + thatMed.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId +"' and Indicator eq 'END' and FromDate eq datetime'" + thatMed.getView().byId("ID_PAT_DASH_MEDIC_DATA_BY_DATE_DATEPICKER").getValue() + "'";
			thatMed.getView().byId("ID_PAT_DASH_MEDIC_HEADER_TB_MEDHIST").setVisible(true);
		}else if(type === "ActiveMedication"){
	    	thatMed.getView().byId("ID_PAT_DASH_MEDIC_HISTORY").setVisible(true);
	 		thatMed.getView().byId("ID_PAT_DASH_MEDIC_ACTIVEMEDIC").setVisible(false);
	 		thatMed.getView().byId("ID_PAT_DASH_MEDIC_TITLE").setText("Active Medication");
	 		sPath = "ActiveMedicationSet?$filter= Case eq '" + thatMed.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId +"' and Indicator eq 'ACT'";
	 		thatMed.getView().byId("ID_PAT_DASH_MEDIC_HEADER_TB_MEDHIST").setVisible(false);
	 	}
		thatMed.getView().byId("ID_PAT_DASH_MEDIC_SEARCH").setValue("");
		thatMed.oMedication = new sap.ui.model.json.JSONModel({"MedicationData": []});
		
		com.ril.hn.emrpatient.util.DataManager.readData(sPath,thatMed.oModelScored, null, null, {type:type}, thatMed.onFSActiveMedicationOrderReadSuccess, thatMed.onFSActiveMedicationOrderReadError);
		
	},
	
	onFSActiveMedicationOrderReadSuccess : function(oData, oResponse, oRefData) {
		thatMed.oMedication.getData().MedicationData =  oData.results ;
		var oCombo = new sap.ui.model.json.JSONModel({"FilterSet" : thatMed.getFilterItems(oData.results) });
		thatMed.filterContent.setModel(oCombo);		
		thatMed.filterContent.getModel("undefined").refresh(true);
		thatMed.prepareMedicationTable(oRefData.type);
		com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(thatMed);
	    },

	    onFSActiveMedicationOrderReadError : function(oData, oResponse, oRefData) {
	    	thatMed.oMedication.getData().MedicationData =  [] ;
	    	com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(thatMed);
	        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
	    },
	
	    
	
	/* on search of patient entering the value on search box */
	_handlePatientsSearch : function (oEvent){
		/* Searching patients in master table */
		var sValue = oEvent.getSource().getValue() ;
		
		var oFilter ;
		var xFilter ;
		var myFilter = new sap.ui.model.Filter({filters: [], and: false});
		for(var i=0;i<thatMed.filterContent.getSelectedItems().length;i++){
			oFilter = new sap.ui.model.Filter("OrderTypeDesc", sap.ui.model.FilterOperator.EQ, thatMed.filterContent.getSelectedItems()[i].getTitle());
			myFilter.aFilters.push(oFilter);
		}		
		var yFilter = new sap.ui.model.Filter("DrugDesc", sap.ui.model.FilterOperator.Contains, sValue);
		if (thatMed.filterContent.getSelectedItems().length == "0"){
			xFilter = new sap.ui.model.Filter({filters: [yFilter], and: true});			
		} else {
			xFilter = new sap.ui.model.Filter({filters: [yFilter,myFilter], and: true});
		}
		var oBinding = thatMed.getView().byId("ID_PAT_DASH_MEDIC_DATA_TABLE").getBinding("items");
		oBinding.filter([xFilter]);			
	},
	
	/* on click of the filter button */
	_onOpenPopOver : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/Medications/Filtr", "clicked");
		thatMed.filterPopup.openBy(oEvent.getSource());
	},
	
	/* on filter of order type */
	onFilterSelectionChange : function (oEvent){
		var oFilter ;
		var myFilter = new sap.ui.model.Filter({filters: [], and: false});;
		for(var i=0;i<oEvent.getSource().getSelectedItems().length;i++){
			oFilter = new sap.ui.model.Filter("OrderTypeDesc", sap.ui.model.FilterOperator.EQ, oEvent.getSource().getSelectedItems()[i].getTitle());
			myFilter.aFilters.push(oFilter);
			thatMed.filterContent.setSelectedItem(oEvent.getSource().getSelectedItems()[i]);
		}
		var oBinding = thatMed.getView().byId("ID_PAT_DASH_MEDIC_DATA_TABLE").getBinding("items");
		if(oEvent.getSource().getSelectedItems().length == "0"){
			oBinding.filter([]);	
		} else {
			oBinding.filter([myFilter]);
		}
	},
	
	_onMedicationOrderButtonPressed : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/Medications/MedicationOrder", "clicked");
			//Instead of new page, open tcode in link
			if(thatMed.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId !== ""){
				var oPatient = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
			    com.ril.hn.emrpatient.util.OrderManager.onCreateMedicationOrder(oPatient ,thatMed.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData);
			}else{
				com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_VALID_CASE_ERROR"), "INFORMATION", "Info");
				return;
			}
	},
	
	onMedHistOrActMedSort : function(oEvent){
	    	ga( "send" , "event" , "ClinicalOVPhysician/Medications/MedSortSelDiag", "clicked");
	    	com.ril.hn.emrpatient.util.Utility.onDialogOpen(thatMed,"viewsetting.ActiveMedicationVS","ActiveMedicationVS");
		},
	
	handleActMedSettingsConfirm : function(oEvent) {
		  ga( "send" , "event" , "ClinicalOVPhysician/Medications/MedSortSel", "clicked");
		  com.ril.hn.emrpatient.util.Utility.onSortItems(this,"ID_PAT_DASH_MEDIC_DATA_TABLE",oEvent);
	},
	
	
	applyGrpFilSrt : function(type){
		var oBinding = thatMed.getView().byId("ID_PAT_DASH_MEDIC_DATA_TABLE").getBinding("items");
		var aSorters = [];
	        var vGroup = function(oContext) {
	             var name = oContext.getProperty("ClassDesc");
	             return {
	                 key: name,
	                 text: name
	             };
	         };
	         aSorters.push(new sap.ui.model.Sorter("ClassDesc", true , vGroup));
	     
	     aSorters.push(new sap.ui.model.Sorter("ToDate", true));
	     oBinding.sort(aSorters);
	    
	    /* if(type === "MedicationHistory"){
				thatMed.getView().byId("ID_PAT_DASH_MEDIC_FILTER_POP").setVisible(false);
				var oFromFilter = new sap.ui.model.Filter("FromDate", sap.ui.model.FilterOperator.LE , new Date());
				var oToFilter = new sap.ui.model.Filter("ToDate", sap.ui.model.FilterOperator.GE , new Date());
				var oFilter =  new sap.ui.model.Filter({filters: [oFromFilter,oToFilter], and: true })
				oBinding.filter([oFilter]);
			}else if(type === "ActiveMedication"){
				thatMed.getView().byId("ID_PAT_DASH_MEDIC_FILTER_POP").setVisible(true);*/
				if(thatMed.filterContent.getSelectedItems().length != 0){
					var oFilter ;
					var  myFilter = new sap.ui.model.Filter({filters: [], and: false});;
					for(var i=0;i<thatMed.filterContent.getSelectedItems().length;i++){
						oFilter = new sap.ui.model.Filter("OrderTypeDesc", sap.ui.model.FilterOperator.EQ, thatMed.filterContent.getSelectedItems()[i].getTitle());
						myFilter.aFilters.push(oFilter);
						thatMed.filterContent.setSelectedItem(thatMed.filterContent.getSelectedItems()[i]);
						}
					oBinding.filter([myFilter]);
				} else {
					if(thatMed.filterContent.getItems().length != 0){
						var oFilter = new sap.ui.model.Filter("OrderTypeDesc", sap.ui.model.FilterOperator.Contains, thatMed.filterContent.getItems()[0].getTitle());
						oBinding.filter([oFilter]);
						thatMed.filterContent.setSelectedItem(thatMed.filterContent.getItems()[0]);
					}
				//}
		 	}
	     
	},
	
	
	onMedHistDateChange : function(oEvent){
		var date = oEvent.getSource().getValue();
		thatMed.getView().byId("ID_PAT_DASH_MEDIC_DATA_BY_DATE_DATEPICKER").setDateValue(new Date(date));
		var oFromFilter = new sap.ui.model.Filter("FromDate", sap.ui.model.FilterOperator.LE ,new Date(date));
		var oToFilter = new sap.ui.model.Filter("ToDate", sap.ui.model.FilterOperator.GE , new Date(date));
		var oFilter =  new sap.ui.model.Filter({filters: [oFromFilter,oToFilter], and: true })
		thatMed.getView().byId("ID_PAT_DASH_MEDIC_DATA_TABLE").getBinding("items").filter([oFilter]);
	},
	
	onMedHistDateChange : function(oEvent){
		var dt = thatMed.getView().byId("ID_PAT_DASH_MEDIC_DATA_BY_DATE_DATEPICKER");
		var t = "",key="";
		if(oEvent.getSource().getCustomData()[0])
			key = oEvent.getSource().getCustomData()[0].getValue();
		if(key == "PAST")
			t = dt.getDateValue().getTime() - (24*60*60*1000);
		else if(key == "FUTURE")
			t = dt.getDateValue().getTime() + (24*60*60*1000);
		else
			t = dt.getDateValue();
		var d = new Date(t);
		d.setHours(0);
		d.setMinutes(0);
		d.setSeconds(0);
		d.setMilliseconds(0);
		dt.setDateValue(d);
		var sPath = "ActiveMedicationSet?$filter= Case eq '" + thatMed.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId +"' and Indicator eq 'END' and FromDate eq datetime'" + thatMed.getView().byId("ID_PAT_DASH_MEDIC_DATA_BY_DATE_DATEPICKER").getValue() + "'";
		com.ril.hn.emrpatient.util.DataManager.readData(sPath,thatMed.oModelScored, null, null, null,  function(oData, oResponse, oRefData) {
			thatMed.oMedication.getData().MedicationData =  oData.results ;
			var oCombo = new sap.ui.model.json.JSONModel({"FilterSet" : thatMed.getFilterItems(oData.results) });
			thatMed.filterContent.setModel(oCombo);		
			thatMed.filterContent.getModel("undefined").refresh(true);
			thatMed.oMedication.refresh(true);
			thatMed.applyGrpFilSrt("MedicationHistory");
		}, function(oData, oResponse, oRefData) {
			thatMed.oMedication.getData().MedicationData =  [] ;
			 com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
		});
	},
	
	/*onMedHistDateFuture : function(oEvent){
		var dt = thatMed.getView().byId("ID_PAT_DASH_MEDIC_DATA_BY_DATE_DATEPICKER");
		var t = dt.getDateValue().getTime() + (24*60*60*1000);
		var d = new Date(t);
		d.setHours(5);
		d.setMinutes(30);
		d.setSeconds(0);
		d.setMilliseconds(0);
		dt.setDateValue(d);
		var oFromFilter = new sap.ui.model.Filter("FromDate", sap.ui.model.FilterOperator.LE,d);
		var oToFilter = new sap.ui.model.Filter("ToDate", sap.ui.model.FilterOperator.GE,d);
		var oFilter =  new sap.ui.model.Filter({filters: [oFromFilter,oToFilter], and: true });
		thatMed.getView().byId("ID_PAT_DASH_MEDIC_DATA_TABLE").getBinding("items").filter([oFilter]);
	},*/
});
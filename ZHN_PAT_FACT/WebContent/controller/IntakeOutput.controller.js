jQuery.sap.require("sap.ui.core.mvc.Controller");
jQuery.sap.require("com.ril.hn.emrpatient.util.Formatter");

sap.ui.core.mvc.Controller.extend("com.ril.hn.emrpatient.controller.IntakeOutput", {
	oDefaultParams: {
        sEntityPath: "",
        sFilterPath: "",
        bAllergyRefreshRequired: true
    },
    
	onInit : function() {
		thatIO = this ;
		this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView()));
		thatIO.i18n =  this._oComponent.getModel("i18n").getResourceBundle();

		this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
		this._oRouter.attachRoutePatternMatched(this._onRoutePatternMatched, this);
	},

	_onRoutePatternMatched : function(oEvent) {
		// if not this page then return
		if (oEvent.getParameter("name") !== "PatientsIntakeOutput") {
			return;
		}
		ga("send", "pageview", "ClinicalOVPhysician/IntakeOutput");
		 
		// if this page then initialize the screen
		thatIO = this ;
		var patientHeaderModel = sap.ui.getCore().getModel("PatientHeaderModel");
		
		if(patientHeaderModel == undefined){
			thatIO._oRouter.navTo("PatientOverview", {} , false );
		}else{
			thatIO.oModel = this.getView().getModel("IP_OP_SRV");
			
			thatIO.getView().setModel(patientHeaderModel , "PatientHeader");
			thatIO.getView().bindElement("PatientHeader>/Patient/0");

			thatIO.oDefaultParams.sEntityPath = "/" + oEvent.getParameters().arguments.entity;
			thatIO.casesAndTimeIntervalsModel = sap.ui.getCore().getModel("CasesAndTimeIntervalsDrModel");
			thatIO.selectedCasesAndTimeIntervalsModel = sap.ui.getCore().getModel("SelectedCasesAndTimeIntervalsDrModel");
			
			thatIO.getView().byId("ID_PAT_DASH_IO_OBJ_HEADER_TIME_FILTER").setText(thatIO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Label);
			thatIO.getView().byId("ID_PAT_DASH_IO_SEARCH_FIELD").setValue("");
			
			thatIO._initFSIntakeOutput("");
		}
	},
	
	onNavBack : function(){
		window.history.go(-1);
	},
	
	_initFSIntakeOutput : function(sPath){
		com.ril.hn.emrpatient.util.Utility.onBusyIndicatorOpen(thatIO);
		if(!sPath)
			sPath = "GetListSet?$filter=ICase eq '"+thatIO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId+"' and PatientNumber eq '"+sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].ExternalPatientId+"'";
		thatIO.oIntakeOutput = new sap.ui.model.json.JSONModel({"IntakeOutputData" : []  });
		com.ril.hn.emrpatient.util.DataManager.readData(sPath,thatIO.oModel, null, null, null, thatIO.onFSIntakeOutputReadSuccess, thatIO.onFSIntakeOutputReadError);
	},
	
	onFSIntakeOutputReadSuccess : function(oData, oResponse, oRefData) {
		thatIO.oIntakeOutput.getData().IntakeOutputData = oData.results ;
		thatIO._initIntakeOutput();
	    },

	    onFSIntakeOutputReadError : function(oData, oResponse, oRefData) {
	    	thatIO.oIntakeOutput.getData().IntakeOutputData = [] ;
			thatIO._initIntakeOutput();
	        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
	    },
	
	_initIntakeOutput : function(){
		thatIO.getView().byId("ID_PAT_DASH_IO_DATE_LINK").setText(thatIO.oIntakeOutput.getData().IntakeOutputData[0].FilterCriteria);
		if (thatIO.oIntakeOutput.getData().IntakeOutputData[0].PatientNumber == "XXXXXXXXXX")
	        	thatIO.oIntakeOutput.getData().IntakeOutputData = [];
		com.ril.hn.emrpatient.util.UiControlManager.initTableControl(thatIO,thatIO.getView().byId("ID_PAT_DASH_IO_TABLE"), thatIO.getFSIntakeOutputTemplate(),thatIO.oIntakeOutput, "IntakeOutputData");
		var volume = com.ril.hn.emrpatient.util.Formatter.getIOVolumeText(thatIO.oIntakeOutput.getData().IntakeOutputData);
        thatIO.getView().byId("ID_PAT_DASH_IO_VOLUME_TEXT").setText(volume); 
        com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(thatIO);
	},
	
	getFSIntakeOutputTemplate : function(){
		var oTempl = new sap.m.ColumnListItem({
            cells: [
                    new sap.m.ObjectStatus({
                    text: "{path:'Category',formatter:'com.ril.hn.emrpatient.util.Formatter.getIOCategoryDescription'}",
                    state:"{path:'Category',formatter:'com.ril.hn.emrpatient.util.Formatter.getIOCategoryStatus'}"               
                }), new sap.m.ObjectStatus({
                    text: "{IoTypeDes}",
                    state:"{path:'Category',formatter:'com.ril.hn.emrpatient.util.Formatter.getIOCategoryStatus'}"               
                }), new sap.m.Input({
                	value: "{Value}",
                	description : "{path : 'Unit' , formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedUnit'}",
                	editable : false,
                    wrapping: true
                }), new sap.m.Text({
                    text: "{Comments}",
                    wrapping: true
                }),  new sap.m.Text({
                    text: "{parts : [{path:'DateFrom'},{path:'TimeFrom'}] , formatter :'com.ril.hn.emrpatient.util.Formatter.getFormattedDateTimeForDietary'}",
                    wrapping: true
                })/*, new sap.m.Text({
                    text: "{parts : [{path:'DateTo'},{path:'TimeTo'}] , formatter :'com.ril.hn.emrpatient.util.Formatter.getFormattedDateTimeForDietary'}",
                    wrapping: true
                })*/]
            });
        return oTempl;
	},
	
	onIODateToFromLinkPress : function(){
	    	ga('send','event','ClinicalOVPhysician/IntakeOutput/DateLink','clicked');
	    	com.ril.hn.emrpatient.util.Utility.onDialogOpen(thatIO, "fragment.IntakeOutputDateSelection", "IntakeOutputDateSelection");
	    	sap.ui.getCore().byId("ID_IO_FROMDATE").setValue(com.ril.hn.emrpatient.util.Formatter.getIOFromDateTimeSplit(thatIO.getView().byId("ID_PAT_DASH_IO_DATE_LINK").getText()));
	    	sap.ui.getCore().byId("ID_IO_TODATE").setValue(com.ril.hn.emrpatient.util.Formatter.getIOToDateTimeSplit(thatIO.getView().byId("ID_PAT_DASH_IO_DATE_LINK").getText()));
	 },
	    
	 
	 onIODateToFromOkPress : function(){
	    	ga('send','event','ClinicalOVPhysician/IntakeOutput/DateLinkOk','clicked');
	    	var fromDate = sap.ui.getCore().byId("ID_IO_FROMDATE").getDateValue();
	    	var toDate = sap.ui.getCore().byId("ID_IO_TODATE").getDateValue();
	    	if(fromDate>toDate){
	    		com.ril.hn.emrpatient.util.Utility.displayError(thatIO.i18n.getText("MESSAGE_TO_TIME"), "ERROR", "Alert");
	    	} else {
	    		var sPath ="/GetListSet/?$filter=ICase eq '"+ thatIO.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId +
	    		"' and PatientNumber eq '"+ sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].ExternalPatientId +
	    		"' and DateFrom eq datetime'"+ com.ril.hn.emrpatient.util.Formatter.toFromDateFormat(fromDate)+
	    		"' and TimeFrom eq time'"+ com.ril.hn.emrpatient.util.Formatter.toFromTimeFormat(fromDate)+
	    		"' and DateTo eq datetime'"+ com.ril.hn.emrpatient.util.Formatter.toFromDateFormat(toDate)+
	    		"' and TimeTo eq time'"+ com.ril.hn.emrpatient.util.Formatter.toFromTimeFormat(toDate)+"'";
	        	thatIO._initFSIntakeOutput(sPath);
	        	com.ril.hn.emrpatient.util.Utility.onDialogClose(thatIO,"IntakeOutputDateSelection");
	    	}
	    },
	    
	   onIODateToFromCancelPress : function(){
	    	ga('send','event','IntakeOutput/DetailIntakeOp/EventLinkCancel','clicked');
	    	thatIO.IntakeOutputDateSelection.close();
	    	com.ril.hn.emrpatient.util.Utility.onDialogClose(thatIO,"IntakeOutputDateSelection");
	    },
	    
	    
	    _handleTypeNameSearch : function(oEvent){
	        var sValue = oEvent.getSource().getValue();
	        var oFilter = new sap.ui.model.Filter("IoTypeDes", sap.ui.model.FilterOperator.Contains, sValue);
	        var oBinding = thatIO.getView().byId("ID_PAT_DASH_IO_TABLE").getBinding("items");
	        oBinding.filter([oFilter]);    
	    },
	    
	    onIntakeOutputSortPress : function(){
	    	ga('send','event','ClinicalOVPhysician/IntakeOutput/Sort','clicked');
	    	com.ril.hn.emrpatient.util.Utility.onDialogOpen(this,"viewsetting.IntakeOutputVS","IntakeOutputVS");
	    },
	    
	    _handleIntakeOutputSortConfirm: function(oEvent) {
	    	ga('send','event','ClinicalOVPhysician/IntakeOutput/SortOk','clicked');
	        com.ril.hn.emrpatient.util.Utility.onSortItems(this,"ID_PAT_DASH_IO_TABLE",oEvent);
	    },
	    
	
	
});
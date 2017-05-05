jQuery.sap.require("sap.ui.core.mvc.Controller");
jQuery.sap.require("com.ril.hn.emrpatient.util.UiControlManager");
jQuery.sap.require("com.ril.hn.emrpatient.util.LabResultsManager");
jQuery.sap.require("com.ril.hn.emrpatient.util.OrderManager");
jQuery.sap.require("com.ril.hn.emrpatient.util.CaseAndTimeIntervalManager");
jQuery.sap.require("com.ril.hn.emrpatient.util.base64");
jQuery.sap.require("com.ril.hn.emrpatient.util.Formatter");

//chage date formats

sap.ui.core.mvc.Controller.extend("com.ril.hn.emrpatient.controller.PatientDashboard", {

    oDefaultParams: {
        sEntityPath: "",
        sFilterPath: "",
        bAllergyRefreshRequired: true,
        sAppType : ""
    },

    onInit: function() {
        this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView()));
        this.i18n = this._oComponent.getModel("i18n").getResourceBundle();

        this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        this._oRouter.attachRoutePatternMatched(this._onRoutePatternMatched, this);

        //Fix for removal of this.getTransformToElement method - charts behaves abnormal otherwise
        SVGElement.prototype.getTransformToElement = SVGElement.prototype.getTransformToElement || function(elem) {
            return elem.getScreenCTM().inverse().multiply(this.getScreenCTM());
        };
    },

    _onRoutePatternMatched: function(oEvent) {
        // if not this page then return
        if (oEvent.getParameter("name") !== "PatientDashboard") {
            return;
        }

        ga("send", "pageview", "ClinicalOVPhysician/PatientDashboard");

        // if this page then initialize the screen
        that = this;
        var patientHeaderModel = sap.ui.getCore().getModel("PatientHeaderModel");

        if (patientHeaderModel == undefined) {
            that._oRouter.navTo("PatientOverview", {}, false);
        } else {
            this.oModel = this.getView().getModel("EMR_SRV");
            this.oModelEMR = this.getView().getModel("GATEWAY_SRV");
            this.oModelDietary = this.getView().getModel("DIETARY_SRV");
            this.oModelVitals = this.getView().getModel("VITALS_SRV");
            this.oModelScored = this.getView().getModel("SCORES_SRV");
            this.oModelDischarge = this.getView().getModel("MOB_DISCHARGE_SRV");

            this.oDefaultParams.sEntityPath = "/PatientCollection('" + patientHeaderModel.getData().Patient[0].Id + "')";
            this.oDefaultParams.sEntityPath = this.oDefaultParams.sEntityPath.replace(" ", "%20");
            this.oDefaultParams.sAppType = oEvent.getParameters().arguments.type;
            
            this.initConfigData();
            
            this.initScreenData();
        }
    },

    initConfigData: function() {
        this.oConfig = sap.ui.getCore().getModel("ConfigModel");
        this.getView().setModel(this.oConfig, "Config");
        this.getView().bindElement("Config>/ConfigData/0");
    },

    initScreenData: function() {
        var refreshScreenModel = sap.ui.getCore().getModel("RefreshScreenModel");
        if (refreshScreenModel.getData().Refresh) {
            com.ril.hn.emrpatient.util.Utility.onBusyIndicatorOpen(this);
            refreshScreenModel.getData().Refresh = false;
            that.oDefaultParams.bAllergyRefreshRequired = false;
            this.destroyFragments();
            this.initHeaderData();
            this.getCasesAndTimeIntervals(that.oDefaultParams.sEntityPath);
        }
    },

    initHeaderData: function() {
        var p = sap.ui.getCore().getModel("PatientHeaderModel");
        this.getView().setModel(p, "PatientHeader");
        this.getView().bindElement("PatientHeader>/Patient/0");

        var objHeader = that.getView().byId("ID_PAT_DASH_OBJ_HEADER");
        var sPath = this.oDefaultParams.sEntityPath + "/$value";
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, this.oModel, null, null, null, function(oData, oResponse, oRefData) {
            if (oResponse.body != "") {
                objHeader.setIcon(oResponse.requestUri);
            } else {
                objHeader.setIcon("sap-icon://person-placeholder");
            }
        }, function(oData, oResponse, oRefData) {
            objHeader.setIcon("sap-icon://person-placeholder");
            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });

        var privIns = that.getView().byId("ID_PAT_DASH_PRIVATE_INSURED");
        var src = jQuery.sap.getModulePath("com.ril.hn.emrpatient") + "/images/private1.PNG";
        privIns.setIcon(src);
    },

    getAttendingPhysician: function() {
        //Attending physician
        sPath = "/AttendingPhysicianSet(Patient='" + sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].ExternalPatientId + "',Case='" + that.selectedCaseAndTimeInterval.CaseId + "')";
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelVitals, null, null, null, function(oData, oResponse, oRefData) {
            var m = sap.ui.getCore().getModel("PatientHeaderModel");
            m.getData().Patient[0].AttendingPhy = oData.AttendingName;
            m.getData().Patient[0].AttendingPhyNo = oData.AttendingEmployee;
            m.getData().Patient[0].AdmittingPhy = oData.AdmittingName;
            m.getData().Patient[0].AdmittingPhyNo = oData.AdmittingEmployee;
            m.refresh(true);
        }, function(oData, oResponse, oRefData) {
            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });
    },
    
    getAllWebFacetsData : function(){
		var sPath = that.oDefaultParams.sEntityPath + "/WebFacets"; 
		that.oWebFacets = new sap.ui.model.json.JSONModel({"WebFacetsData" : []  });
		com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModel, null, null, null, function(oData, oResponse, oRefData) {
			that.oWebFacets.getData().WebFacetsData = oData.results ;
        }, function(oData, oResponse, oRefData) {
        	that.oWebFacets.getData().WebFacetsData = [] ;
            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });
	},

    //------------------ Methods

    destroyFragments: function() {
       //destroy the cases and time interval dialog
        that.oCasesAndTimeIntervalsDialog = undefined;

        //destroy fragments before navigating
       // that.destroyAllFragments();
        sap.ui.getCore().setModel(undefined, "LabResultsDrFullScreenModel");
        sap.ui.getCore().setModel(undefined, "LabResultsDrTimestampsFullScreenModel");
    },

    onDialogClose: function(oEvent) {
        var sType = "";
        if (typeof oEvent == "object") {
            sType = oEvent.getSource().data("dialogType");
        } else if (typeof oEvent == "string") {
            sType = oEvent;
        }
        //var sType = oEvent.getSource().data("dialogType");
        if (sType == "Allergies" && that.isAllergyRefreshRequired == true) {
            that.refreshAllergiesData();
        }else if(sType == "FioriApp"){
        	var type = that.FioriApp.getTitle();
			if(type == "Diagnosis"){
				that.initDiagnosisPanel(true);
			}else if(type == "Ad Hoc Services"){
				that.refreshAdhocServicesPanel();
			}
        }
        this[sType].close();
    },


    //-------------- Initialise Cases & Time interval 
    getCasesAndTimeIntervals: function(entityPath) {
        this.oCasesAndTimeIntervals = new sap.ui.model.json.JSONModel({
            "CasesAndTimeIntervalsData": []
        });
        var sPath = this.oDefaultParams.sEntityPath + "/TimeIntervals";
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, this.oModel, null, null, null, this.onCasesAndTimeReadSuccess, this.onCasesAndTimeReadError);
   },

    onCasesAndTimeReadSuccess: function(oData, oResponse, oRefData) {
        that.oCasesAndTimeIntervals.getData().CasesAndTimeIntervalsData = oData.results;
        sap.ui.getCore().setModel(that.oCasesAndTimeIntervals, "CasesAndTimeIntervalsDrModel");
        that.setTimeIntervalSelection(oData.results);
        that.initDashboardPanelsData();
        that.getAttendingPhysician();
        that.getAllWebFacetsData();
    },

    onCasesAndTimeReadError: function(oData, oResponse, oRefData) {
        that.oCasesAndTimeIntervals.getData().CasesAndTimeIntervalsData = [];
        sap.ui.getCore().setModel(that.oCasesAndTimeIntervals, "CasesAndTimeIntervalsDrModel");
        that.setTimeIntervalSelection([]);
        that.getAttendingPhysician();
        that.getAllWebFacetsData();
        that.initDashboardPanelsData();
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },

    setTimeIntervalSelection: function(results) {
        // set last week as default time interval else 0th item -- changed to first case -- changed to show open ip case for ip patients & op for op patients
        that.selectedCaseAndTimeInterval = {};
        that.selectedCaseAndTimeIntervalIndex = 0;
        /*for(var i=0; i<results.length; i++) {
	        if (results[i].Label == "Last Week" || results[i].Id == "INT010"){
	        	that.selectedCaseAndTimeInterval = results[i] ;
	        	that.selectedCaseAndTimeIntervalIndex = i ;
	        	return true;
	        }
	    }*/
        if (results.length > 0) {
        	//op - ip segregation of cases -- commented since end date does not come till next 5 mins -- 8/3/2017
        	/*var a = [];
        	a  = com.ril.hn.emrpatient.util.CaseAndTimeIntervalManager.getAllCasesSorted(results,that.oDefaultParams.sAppType);
        	that.selectedCaseAndTimeInterval = a[0];
            that.selectedCaseAndTimeIntervalIndex = a[0].SelectedIndex;*/
            
        	//show the case which has same admission date -- 9/3/2017
        	var a = [], pat = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
        	that.selectedCaseAndTimeInterval = results[0];
            that.selectedCaseAndTimeIntervalIndex = 0;
        	a  = com.ril.hn.emrpatient.util.CaseAndTimeIntervalManager.getAllCasesSorted(results,that.oDefaultParams.sAppType);
        	$.each(a,function(i,item){
        		if(pat.DateOfAdmission.getTime() == (new Date(item.StartDate).getTime()-(5*60*60*1000+30*60*1000))){
        			that.selectedCaseAndTimeInterval = item;
                    that.selectedCaseAndTimeIntervalIndex = item.SelectedIndex;
                    return;
        		}
        	});
        	
            that.selectedCaseAndTimeInterval['SelectedIndex'] = that.selectedCaseAndTimeIntervalIndex ;
    		sap.ui.getCore().setModel(new sap.ui.model.json.JSONModel({"SelectedCasesAndTimeIntervalsData":that.selectedCaseAndTimeInterval}),"SelectedCasesAndTimeIntervalsDrModel");
            
        }

        if (that.selectedCaseAndTimeInterval)
            that.oDefaultParams.sFilterPath = ("?$filter=TimeInterval eq'" + that.selectedCaseAndTimeInterval.Id + "'").replace(" ", "%20");
        else
            that.oDefaultParams.sFilterPath = "";
        that.getView().byId("ID_PAT_DASH_OBJ_HEADER_TIME_FILTER").setText(that.selectedCaseAndTimeInterval.Label);

    },
    //------------- End

    //------------- Open & Set Cases & Time Intervals
    onCaseAndTimeIntervalsPressed: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/CseNTymIntDiag", "clicked");
        com.ril.hn.emrpatient.util.CaseAndTimeIntervalManager.onOpenCaseAndTimeIntervalDialog(that,that.oCasesAndTimeIntervals,that.oDefaultParams.sEntityPath,that.oModelEMR,that.selectedCaseAndTimeIntervalIndex,that.handleCasesAndTimeIntervalsClose);
   },

    handleCasesAndTimeIntervalsClose: function(oEvent) {
        var oSelectedItem = oEvent.getParameter("selectedItem");
        if (oSelectedItem) {
            ga("send", "event", "ClinicalOVPhysician/PatientDashboard/CseNTymIntSel", "clicked");

            // get case id and time intervals and refresh the ui
            var context = oSelectedItem.getBindingContext();
            var object = context.getObject(context.sPath);

            that.selectedCaseAndTimeInterval = object;
            that.selectedCaseAndTimeIntervalIndex = context.sPath.split("/")[2];

            /*that.selectedCaseAndTimeInterval['SelectedIndex'] = that.selectedCaseAndTimeIntervalIndex ;
    		sap.ui.getCore().setModel(new sap.ui.model.json.JSONModel({"SelectedCasesAndTimeIntervalsData":that.selectedCaseAndTimeInterval}),"SelectedCasesAndTimeIntervalsDrModel");
            */
            oSelectedItem.setSelected(true);

            that.oDefaultParams.sEntityPath = ("/PatientCollection('" + sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].Id + "')").replace(" ", "%20");
            that.oDefaultParams.sFilterPath = ("?$filter=TimeInterval eq'" + object.Id + "'").replace(" ", "%20");

            that.initPanelsData();
            
            that.getView().byId("ID_PAT_DASH_OBJ_HEADER_TIME_FILTER").setText(that.selectedCaseAndTimeInterval.Label);
        }

    },

    //-------------- End

    //-------------- Dashboard initialisation
    initDashboardPanelsData: function() {
        if (sap.ui.Device.system.phone)
            that.initPhonePanelsUi();
        else
            that.initDesktopPanelsUi();
        that.initPanelsData();
    },

    initDesktopPanelsUi: function(entityPath, filter) {
        var leftLayout = that.getView().byId("ID_PAT_DASH_VERT_LEFT");
        var rightLayout = that.getView().byId("ID_PAT_DASH_VERT_RIGHT");
        var c = that.oConfig.getData().ConfigData[0];

        if (!that.co && c.isPDClinicalOdrPanelVisible) {
            that.co = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.ClinicalOrder",
                type: "XML"
            }, that);
            leftLayout.addContent(that.co);
        }
        if (!that.po && c.isPDPhysicianOdrPanelVisible) {
            that.po = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.PhysicianOrder",
                type: "XML"
            }, that);
            leftLayout.addContent(that.po);
        }
        if (!that.ro && c.isPDReferralOdrPanelVisible) {
            that.ro = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.ReferralOrder",
                type: "XML"
            }, that);
            leftLayout.addContent(that.ro);
        }
        if (!that.ar && c.isPDAlrgyAndRiskPanelVisible) {
            that.ar = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.AllergiesAndRisks",
                type: "XML"
            }, that);
            leftLayout.addContent(that.ar);
        }
        if (!that.diag && c.isPDDiagnosisPanelVisible) {
            that.diag = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.Diagnosis",
                type: "XML"
            }, that);
            leftLayout.addContent(that.diag);
        }
        if (!that.doc && c.isPDDocumentsPanelVisible) {
            that.doc = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.Documents",
                type: "XML"
            }, that);
            leftLayout.addContent(that.doc);
        }
        if (!that.am && c.isPDActMedPanelVisible) {
            that.am = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.ActiveMedication",
                type: "XML"
            }, that);
            leftLayout.addContent(that.am);
        }

        if (!that.pn && c.isPDProgNotePanelVisible) {
            that.pn = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.ProgressNotes",
                type: "XML"
            }, that);
            rightLayout.addContent(that.pn);
        }
        if (!that.ch && c.isPDChartsPanelVisible) {
            that.ch = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.Charts",
                type: "XML"
            }, that);
            rightLayout.addContent(that.ch);
        }
        if (!that.lr && c.isPDLabResultPanelVisible) {
            that.lr = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.LabResults",
                type: "XML"
            }, that);
            rightLayout.addContent(that.lr);
        }

        if (!that.ahs && c.isPDAdhocServPanelVisible) {
            that.ahs = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.AdHocServices",
                type: "XML"
            }, that);
            rightLayout.addContent(that.ahs);
        }
        if (!that.diet && c.isPDDietaryPanelVisible) {
            that.diet = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.Dietary",
                type: "XML"
            }, that);
            rightLayout.addContent(that.diet);
        }
        if (!that.pd && c.isPDPatDataPanelVisible) {
            that.pd = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.PatientData",
                type: "XML"
            }, that);
            rightLayout.addContent(that.pd);
        }
        if (!that.oa && c.isPDOthrActvPanelVisible) {
            that.oa = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.OtherActivities",
                type: "XML"
            }, that);
            rightLayout.addContent(that.oa);
        }
    },

    initPhonePanelsUi: function(entityPath, filter) {
        var leftLayout = that.getView().byId("ID_PAT_DASH_VERT_LEFT");
        var c = that.oConfig.getData().ConfigData[0];

        if (!that.co && c.isPDAlrgyAndRiskPanelVisible) {
            that.co = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.ClinicalOrder",
                type: "XML"
            }, that);
            leftLayout.addContent(that.co);
        }
        if (!that.pn && c.isPDProgNotePanelVisible) {
            that.pn = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.ProgressNotes",
                type: "XML"
            }, that);
            leftLayout.addContent(that.pn);
        }
        if (!that.po && c.isPDPhysicianOdrPanelVisible) {
            that.po = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.PhysicianOrder",
                type: "XML"
            }, that);
            leftLayout.addContent(that.po);
        }
        if (!that.ro && c.isPDReferralOdrPanelVisible) {
            that.ro = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.ReferralOrder",
                type: "XML"
            }, that);
            leftLayout.addContent(that.ro);
        }
        if (!that.ar && c.isPDAlrgyAndRiskPanelVisible) {
            that.ar = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.AllergiesAndRisks",
                type: "XML"
            }, that);
            leftLayout.addContent(that.ar);
        }
        if (!that.diag && c.isPDDiagnosisPanelVisible) {
            that.diag = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.Diagnosis",
                type: "XML"
            }, that);
            leftLayout.addContent(that.diag);
        }
        if (!that.doc && c.isPDDocumentsPanelVisible) {
            that.doc = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.Documents",
                type: "XML"
            }, that);
            leftLayout.addContent(that.doc);
        }
        if (!that.am && c.isPDActMedPanelVisible) {
            that.am = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.ActiveMedication",
                type: "XML"
            }, that);
            leftLayout.addContent(that.am);
        }

        if (!that.ch && c.isPDChartsPanelVisible) {
            that.ch = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.Charts",
                type: "XML"
            }, that);
            leftLayout.addContent(that.ch);
        }
        if (!that.lr && c.isPDLabResultPanelVisible) {
            that.lr = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.LabResults",
                type: "XML"
            }, that);
            leftLayout.addContent(that.lr);
        }

        if (!that.ahs && c.isPDAdhocServPanelVisible) {
            that.ahs = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.AdHocServices",
                type: "XML"
            }, that);
            leftLayout.addContent(that.ahs);
        }
        if (!that.diet && c.isPDDietaryPanelVisible) {
            that.diet = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.Dietary",
                type: "XML"
            }, that);
            leftLayout.addContent(that.diet);
        }
        if (!that.pd && c.isPDPatDataPanelVisible) {
            that.pd = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.PatientData",
                type: "XML"
            }, that);
            leftLayout.addContent(that.pd);
        }
        if (!that.oa && c.isPDOthrActvPanelVisible) {
            that.oa = new sap.ui.xmlfragment({
                fragmentName: "com.ril.hn.emrpatient.fragment.ui.OtherActivities",
                type: "XML"
            }, that);
            leftLayout.addContent(that.oa);
        }
    },

    initPanelsData: function(entityPath, filter) {
        var c = that.oConfig.getData().ConfigData[0];
        if (c.isPDClinicalOdrPanelVisible) {
            that.initClinicalOrderPanel();
        }
        if (c.isPDProgNotePanelVisible) {
            that.initProgressNotePanel(true);
        }
        if (c.isPDPhysicianOdrPanelVisible) {
            that.initPhysicianOrderPanel();
        }
        if (c.isPDReferralOdrPanelVisible) {
            that.initReferralOrderPanel();
        }
        if (c.isPDAlrgyAndRiskPanelVisible) {
            that.initAllergyAndRisksPanel();
        }
        if (c.isPDDiagnosisPanelVisible) {
            that.initDiagnosisPanel(false);
        }
        if (c.isPDDocumentsPanelVisible) {
            that.initDocumentsPanel();
        }
        if (c.isPDActMedPanelVisible) {
            that.initActiveMedicationPanel();
        }
        if (c.isPDChartsPanelVisible) {
            that.initChartsPanel();
        }
        if (c.isPDLabResultPanelVisible) {
            that.initLabResultsPanel();
        }
        if (c.isPDAdhocServPanelVisible) {
            that.initAdhocServicesPanel();
        }
        if (c.isPDDietaryPanelVisible) {
            that.initDietaryPanel();
        }
        if (c.isPDPatDataPanelVisible) {
            that.initPatientDataPanel();
        }
        if (c.isPDOthrActvPanelVisible) {
            that.initOtherActivitiesPanel();
        }
        com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(that);
    },

    //-------------- End

    onNavBack: function() {
        //destroy lab results model
        sap.ui.getCore().setModel(undefined, "LabResultsDrFullScreenModel");
        sap.ui.getCore().setModel(undefined, "LabResultsDrTimestampsFullScreenModel");

       /* if (that.CreateProgressNote) {
            that.CreateProgressNote.destroy();
            that.CreateProgressNote = undefined;
        }*/

        sap.ui.getCore().getModel("RefreshScreenModel").getData().Refresh = true;

        window.history.go(-1);
    },

    destroyAllFragments: function() {
    	//add all the fragments here for safety
        com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "CreateProgressNote");
        com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "CreatePhysicianOrder");
        com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "CreateReferralOrder");
        com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "PlannedDischarge");
        com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "EditAllergies");
        com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "AssignAdhocServices");
        com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "EditAssignAdhocServices");
        com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "CreateDietary");
        com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "FioriApp");
    },
    
    onAllPanelsExpand : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/ExpandAll", "clicked");
		
		var leftLayout = that.getView().byId("ID_PAT_DASH_VERT_LEFT").getContent();
		var rightLayout = that.getView().byId("ID_PAT_DASH_VERT_RIGHT").getContent();
		for(var i=0 ; i<leftLayout.length ; i++){
			leftLayout[i].setExpanded(true);
		}
		for(var i=0 ; i<rightLayout.length ; i++){
			rightLayout[i].setExpanded(true);
		}
	},
	
	onAllPanelsCollapse : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/CollapseAll", "clicked");
		
		var leftLayout = that.getView().byId("ID_PAT_DASH_VERT_LEFT").getContent();
		var rightLayout = that.getView().byId("ID_PAT_DASH_VERT_RIGHT").getContent();
		for(var i=0 ; i<leftLayout.length ; i++){
			leftLayout[i].setExpanded(false);
		}
		for(var i=0 ; i<rightLayout.length ; i++){
			rightLayout[i].setExpanded(false);
		}
	},

    //------ Initialise clinical order table
    initClinicalOrderPanel: function() {
        that.oClinicalOrder = new sap.ui.model.json.JSONModel({
            "ClinicalOrderData": []
        });
        var sPath = this.oDefaultParams.sEntityPath + "/MedicalRequests" + that.oDefaultParams.sFilterPath;
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModel, null, null, null, that.onClinicalOrderReadSuccess, that.onClinicalOrderReadError);
        sap.ui.getCore().byId("ID_PAT_DASH_CLINICAL_ORDER_PANEL").setExpanded(true);
    },

    onClinicalOrderReadSuccess: function(oData, oResponse, oRefData) {
        that.oClinicalOrder.getData().ClinicalOrderData = oData.results;
        that.initClinicalOrderTable();
    },

    onClinicalOrderReadError: function(oData, oResponse, oRefData) {
        that.oClinicalOrder.getData().ClinicalOrderData = [];
        that.initClinicalOrderTable();
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },

    initClinicalOrderTable: function() {
        com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, sap.ui.getCore().byId("ID_PAT_DASH_CLINICAL_ORDER_TABL"), that.getClinicalOrderTemplate(), that.oClinicalOrder, "ClinicalOrderData");
        sap.ui.getCore().byId("ID_PAT_DASH_CLINICAL_ORDER_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.oClinicalOrder.getData().ClinicalOrderData.length));
    },

    getClinicalOrderTemplate: function() {
        var oTempl = new sap.m.ColumnListItem({
            cells: [
                new sap.m.ObjectIdentifier({
                    title: "{Title}",
                    text: that.i18n.getText("TXT_CO_DEPARTMENT") + " : {path : 'Department' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getI18nText'}",
                    wrapping: true
                }),
                new sap.ui.layout.VerticalLayout({
                    content: [new sap.m.Label({
                            text: "{path: 'CreationTimestamp',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other'}",
                            design: "Bold",
                            wrapping: true
                        }).addStyleClass("sapUiContentPadding"),
                        new sap.m.ObjectStatus({
                            text: "{Status}",
                            state: "{path: 'Status', formatter: 'com.ril.hn.emrpatient.util.Formatter.getClinicalOrderStatus'}",
                            wrapping: true
                        }).addStyleClass("sapUiContentPadding")
                    ]
                })
            ]
        });
        return oTempl;
    },

    onClinicalOrderCreatePressed: function() {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/COTrans", "clicked");

        /*var patient = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
        com.ril.hn.emrpatient.util.OrderManager.onCreateClinicalOrder(patient, that.selectedCaseAndTimeInterval);*/
        
    	that.destroyAllFragments() ;
        sap.ui.getCore().getModel("RefreshScreenModel").getData().Refresh = true ;
        var pat = that.getView().getModel("PatientHeader").getData().Patient[0];
		var caseNo="";
		if(that.selectedCaseAndTimeInterval.CaseId !== ""){
			caseNo = that.selectedCaseAndTimeInterval.CaseId;
		}else{
			caseNo = that.oCasesAndTimeIntervals.getData().CasesAndTimeIntervalsData[0].CaseId;
		}
		var risk = pat.Attention;
		var allergyStatus = com.ril.hn.emrpatient.util.Formatter.getAllergyStatusCode(that.oAllergiesStatus.getData().AllergiesStatusData.StateTotalText);
		var navigationService = sap.ushell.Container.getService("CrossApplicationNavigation");
		navigationService.toExternal({
			target : { //semanticObject : "ZHN" , action: "Vital_Sign&/VitalsCreateDisplay/"+caseNo}
			//params : { patID: pId, wardID: pWardId, patientName: pName , sPath : sPath}
			shellHash: "#ZHN-ClinicalOrderDoc?Patient="+pat.ExternalPatientId+"&Case="+caseNo+"&PatientName="+pat.NameLabel+"&Sex="+pat.Gender+"&Birthdate="+new Date(pat.Birthdate.replace(/-/g, "/")).getTime()+
	        "&DeptOu="+pat.ThirdLine.split(" ")[0]+"&TreatOu="+pat.WardId+"&AttPhy="+pat.AttendingPhy+"&AttPhyNo="+pat.AttendingPhyNo+"&MovDate="+pat.DateOfAdmission.getTime()+"&AdmPhy="+pat.AdmittingPhy+"&AdmPhyNo="+pat.AdmittingPhyNo+"&room="+pat.CurrentLocation.split(" ")[2]+"&Bed="+pat.CurrentLocation.split(" ")[3]+"&riskFactor="+risk+"&AllergyStatus="+allergyStatus+"&/Clinical Order Overview"
			}
		});
    },
    //--------End


    //---------Initialise physician order table
    initPhysicianOrderPanel: function() {
        that.oPhysicianOrder = new sap.ui.model.json.JSONModel({
            "PhysicianOrderData": []
        });
        var sPath = this.oDefaultParams.sEntityPath + "/Todos" + that.oDefaultParams.sFilterPath;
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModel, null, null, null, that.onPhysicianOrderReadSuccess, that.onPhysicianOrderReadError);
        sap.ui.getCore().byId("ID_PAT_DASH_PHYSICIAN_ORDER_PANEL").setExpanded(false);
    },

    onPhysicianOrderReadSuccess: function(oData, oResponse, oRefData) {
        that.oPhysicianOrder.getData().PhysicianOrderData = oData.results;
        that.initPhysicianOrderTable();
    },

    onPhysicianOrderReadError: function(oData, oResponse, oRefData) {
        that.oPhysicianOrder.getData().PhysicianOrderData = [];
        that.initPhysicianOrderTable();
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },

    initPhysicianOrderTable: function() {
        com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, sap.ui.getCore().byId("ID_PAT_DASH_PHYSICIAN_ORDER_TABL"), that.getPhysicianOrderTemplate(), that.oPhysicianOrder, "PhysicianOrderData");
        sap.ui.getCore().byId("ID_PAT_DASH_PHYSICIAN_ORDER_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.oPhysicianOrder.getData().PhysicianOrderData.length));
        sap.ui.getCore().byId("ID_PAT_DASH_PHYSICIAN_ORDER_FILTER").setSelectedKey("OPEN");
        var oFilter = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, "OPEN");
        sap.ui.getCore().byId("ID_PAT_DASH_PHYSICIAN_ORDER_TABL").getBinding("items").filter([oFilter]);
    },

    getPhysicianOrderTemplate: function() {
        var oTempl = new sap.m.ColumnListItem({
            cells: [
                new sap.m.ObjectIdentifier({
                    title: "{Text}",
                    text: that.i18n.getText("TXT_CT_CREATED_BY") + " : {CreatorName}",
                    wrapping: true
                }),
                new sap.ui.layout.VerticalLayout({
                    content: [new sap.m.Label({
                            text: "{path: 'CreatedOn',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other'}",
                            design: "Bold",
                            wrapping: true
                        }).addStyleClass("sapUiContentPadding"),
                        new sap.m.ObjectStatus({
                            text: "{Status}",
                            state: "{path: 'Status', formatter: 'com.ril.hn.emrpatient.util.Formatter.getClinicalTaskStatus'}",
                            wrapping: true
                        }).addStyleClass("sapUiContentPadding")
                    ]
                })
            ],
            type: "Navigation",
            press: that.onPhysicianOrderDetailPressed
        });
        return oTempl;
    },

    onPhysicianOrderDetailPressed: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/PODetailNoteDiag", "clicked");
        com.ril.hn.emrpatient.util.Utility.onDialogOpen(that, "fragment.PhysicianOrderDetailedNote", "PhysicianOrderDetailedNote");

        var context = oEvent.getSource().getBindingContext();
        var object = context.getObject(context.sPath);
        var patient = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].ExternalPatientId;
        var createdDate = com.ril.hn.emrpatient.util.Formatter.getScoreChartsDateTime(object.CreatedOn);
        var oSelectedPO = new sap.ui.model.json.JSONModel({
            "SelectedPhysicianOrderData": [object]
        });
        that.PhysicianOrderDetailedNote.setModel(oSelectedPO, "SelectedPhysicianOrderDrModel");
        that.PhysicianOrderDetailedNote.bindElement("SelectedPhysicianOrderDrModel>/SelectedPhysicianOrderData/0");
        var sPath = "/PhyOrderDetailTxtSet?$filter= ClinicId eq '" + object.Id + "' and Date eq datetime'" + createdDate + "' and Patnr eq '" + patient + "'";
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelVitals, null, null, null, that.onPhysicianOrderDetailReadSuccess, that.onPhysicianOrderDetailReadError);
    },

    onPhysicianOrderDetailReadSuccess: function(oData, oResponse, oRefData) {
        var oPhysicianOrderDetailedNote = new sap.ui.model.json.JSONModel({
            "PhysicianOrderDetailedNoteData": oData.results
        });
        that.PhysicianOrderDetailedNote.setModel(oPhysicianOrderDetailedNote, "PhysicianOrderDetailedNoteModel");
        that.PhysicianOrderDetailedNote.bindElement("PhysicianOrderDetailedNoteModel>/PhysicianOrderDetailedNoteData/0");
    },

    onPhysicianOrderDetailReadError: function(oData, oResponse, oRefData) {
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },

    handlePhysicianOrderFilter: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/POFilter", "clicked");
        var creatorProfession = oEvent.getSource().getSelectedKey();
        var oFilter = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, creatorProfession);
        var oBinding = sap.ui.getCore().byId("ID_PAT_DASH_PHYSICIAN_ORDER_TABL").getBinding("items");
        oBinding.filter([oFilter]);

    },

    handleCreatePhysicianOrder: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/POCreDiag", "clicked");
        com.ril.hn.emrpatient.util.Utility.onDialogOpen(that, "fragment.CreatePhysicianOrder", "CreatePhysicianOrder");
        sap.ui.getCore().byId("ID_PHYSICIAN_ORDER_CATEGORY").setValue("");
        sap.ui.getCore().byId("ID_PHYSICIAN_ORDER_TEXT").setValue("");
    },

    handleValueHelpPhysicianOrderCategory: function() {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/DietGrpDiag", "clicked");
        var oItem = {
            Title: "{Name}",
            Description: "{Id}"
        };
        if (!that.oPhysicianOrderCat || that.oPhysicianOrderCat.getData().PhysicianOrderCatData.length == 0) {
            that.oPhysicianOrderCat = new sap.ui.model.json.JSONModel({
                "PhysicianOrderCatData": []
            });
            com.ril.hn.emrpatient.util.DataManager.readData("/TodoCategoryCollection", that.oModel, null, null, null, function(oData, oResponse, oRefData) {
                that.oPhysicianOrderCat.getData().PhysicianOrderCatData = oData.results;
                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(that, "vhPhysicianOrderCat", "Category", "/PhysicianOrderCatData", oItem, that.vhPhysicianOrderCatSearch, that.vhPhysicianOrderCatClose);
                vh.setModel(that.oPhysicianOrderCat);
                vh.open();
            }, function(oData, oResponse, oRefData) {
                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
            });
        } else {
            if (that.oPhysicianOrderCat.getData().PhysicianOrderCatData.length) {
                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(that, "vhPhysicianOrderCat", "Category", "/PhysicianOrderCatData", oItem, that.vhPhysicianOrderCatSearch, that.vhPhysicianOrderCatClose);
                vh.setModel(that.oPhysicianOrderCat);
                vh.open();
            }
        }
    },


    vhPhysicianOrderCatClose: function(oEvent) {
        var oSelectedItem = oEvent.getParameter("selectedItem");
        if (oSelectedItem) {
            ga("send", "event", "ClinicalOVPhysician/PatientDashboard/POCatSel", "clicked");
            var physicianOrderTitle = oSelectedItem.getTitle();
            that.CreatephysicianOrderTitle = oSelectedItem.getDescription();
            var physicianInputCategory = sap.ui.getCore().byId("ID_PHYSICIAN_ORDER_CATEGORY");
            physicianInputCategory.setValue(physicianOrderTitle);
        }
    },

    vhPhysicianOrderCatSearch: function(oEvent) {
        var sValue = oEvent.getParameter("value");
        var oNameFilter = new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sValue);
        oEvent.getSource().getBinding("items").filter([oNameFilter]);
    },

    handlePhysicianOrderSaveButton: function() {
        var physicianOrderCategory = sap.ui.getCore().byId("ID_PHYSICIAN_ORDER_CATEGORY").getValue();
        var physicianOrderText = sap.ui.getCore().byId("ID_PHYSICIAN_ORDER_TEXT").getValue();

        if (physicianOrderCategory == "") {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_CATEGORY_MANDATORY"), "ERROR", "Alert");
            return false;
        }
        if (physicianOrderText == "") {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_COMMENT_MANDATORY"), "ERROR", "Alert");
            return false;
        }

        var data;
        data = {
            CategoryId: that.CreatephysicianOrderTitle,
            Text: physicianOrderText
        };

        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/POSave", "clicked");

        var sPath = that.oDefaultParams.sEntityPath + "/Todos";

        com.ril.hn.emrpatient.util.DataManager.createData(sPath, that.oModel, null, null, data, null, function(oData, oResponse, oRefData) {
            sap.m.MessageToast.show(that.i18n.getText("TXT_CT_SAVED"));
            sPath = sPath + that.oDefaultParams.sFilterPath;
            com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModel, null, null, null, that.onPhysicianOrderReadSuccess, that.onPhysicianOrderReadError);
            com.ril.hn.emrpatient.util.Utility.onDialogClose(that, "CreatePhysicianOrder");
        }, function(oData, oResponse, oRefData) {
            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });

    },

    //----------End

    //---------Initialise Referral order table
    initReferralOrderPanel: function() {
        that.oReferralOrder = new sap.ui.model.json.JSONModel({
            "ReferralOrderData": []
        });
        var sPath = "ReferralOrderDisplaySet?$filter=Case eq '" + that.selectedCaseAndTimeInterval.CaseId + "'";
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelScored, null, null, null, that.onReferralOrderReadSuccess, that.onReferralOrderReadError);
        sap.ui.getCore().byId("ID_PAT_DASH_REFERRAL_ORDER_PANEL").setExpanded(false);
    },

    onReferralOrderReadSuccess: function(oData, oResponse, oRefData) {
        that.oReferralOrder.getData().ReferralOrderData = oData.results;
        that.initReferralOrderTable();
    },

    onReferralOrderReadError: function(oData, oResponse, oRefData) {
        that.oReferralOrder.getData().ReferralOrderData = [];
        that.initReferralOrderTable();
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },

    initReferralOrderTable: function() {
        com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, sap.ui.getCore().byId("ID_PAT_DASH_REFERRAL_ORDER_TABL"), that.getReferralOrderTemplate(), that.oReferralOrder, "ReferralOrderData");
        sap.ui.getCore().byId("ID_PAT_DASH_REFERRAL_ORDER_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.oReferralOrder.getData().ReferralOrderData.length));
    },

    getReferralOrderTemplate: function() {
        var oTempl = new sap.m.ColumnListItem({
            cells: [
                new sap.ui.layout.VerticalLayout({
                    content: [new sap.m.ObjectStatus({
                            title: that.i18n.getText("TXT_RO_REFERRAL_FROM"),
                            text: "{EmployeeResponsible}",
                            state: "None",
                            wrapping: true
                        }).addStyleClass("sapUiContentPadding"),
                        new sap.m.ObjectStatus({
                            title: that.i18n.getText("TXT_RO_FILLER"),
                            text: "{ReferralDoctor}",
                            state: "None",
                            wrapping: true
                        }).addStyleClass("sapUiContentPadding"),
                        new sap.m.ObjectStatus({
                            title: that.i18n.getText("TXT_RO_REASON"),
                            text: "{Comment}",
                            state: "None",
                            wrapping: true
                        }).addStyleClass("sapUiContentPadding")
                    ]
                }), new sap.ui.layout.VerticalLayout({
                    content: [
                        new sap.m.Label({
                            text: "{parts : [{path: 'CreatedDate'},{path:'CreatedTime'}],  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateTimeForDietary'}",
                            design: "Bold",
                            wrapping: true
                        }),
                        new sap.m.ObjectStatus({
                            title: that.i18n.getText("TXT_CO_DEPARTMENT"),
                            text: "{path : 'OrgUnit' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getI18nText'}",
                            wrapping: true,
                            state: "None"
                        }).addStyleClass("sapUiContentPadding")
                    ]
                })
            ]
        });
        return oTempl;
    },

    handleCreateReferralOrder: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/ROCreateDiag", "clicked");
        if (that.selectedCaseAndTimeInterval && that.selectedCaseAndTimeInterval.CaseId !== "") {
            com.ril.hn.emrpatient.util.Utility.onDialogOpen(that, "fragment.CreateReferralOrder", "CreateReferralOrder");
            sap.ui.getCore().byId("ID_CREATE_REFERRAL_ORDER_TREATMENT_OU").setValue("");
            sap.ui.getCore().byId("ID_CREATE_REFERRAL_ORDER_PHYSICIAN").setValue("");
            sap.ui.getCore().byId("ID_CREATE_REFERRAL_ORDER_PHYSICIAN").setEnabled(false);
            sap.ui.getCore().byId("ID_CREATE_REFERRAL_ORDER_COMMENT").setValue("");
        } else
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_VALID_CASE_ERROR"), "ERROR", "Alert");
    },

    handleValueHelpReferralOrderTreatmentOU: function() {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/DietGrpDiag", "clicked");
        var oItem = {
            Title: "{Lv_Descr}",
            Description: "{Lv_Key}"
        };
        if (!that.oReferralOrderTreatmentOU || that.oReferralOrderTreatmentOU.getData().RererralOrderTreatmentOUData.length == 0) {
            that.oReferralOrderTreatmentOU = new sap.ui.model.json.JSONModel({
                "RererralOrderTreatmentOUData": []
            });
            var sPath = "/ListValuesDTOSet?$filter=Lv_Alias eq 'UI_LV_REFERRAL_OU'";
            com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelEMR, null, null, null, function(oData, oResponse, oRefData) {
                that.oReferralOrderTreatmentOU.getData().RererralOrderTreatmentOUData = oData.results;
                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(that, "vhReferralOrderTreatOU", "Treatment OU", "/RererralOrderTreatmentOUData", oItem, that.vhReferralOrderTreatOUSearch, that.vhReferralOrderTreatOUClose);
                vh.setModel(that.oReferralOrderTreatmentOU);
                vh.open();
            }, function(oData, oResponse, oRefData) {
                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
            });
        } else {
            if (that.oReferralOrderTreatmentOU.getData().RererralOrderTreatmentOUData.length) {
                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(that, "vhReferralOrderTreatOU", "Treatment OU", "/RererralOrderTreatmentOUData", oItem, that.vhReferralOrderTreatOUSearch, that.vhReferralOrderTreatOUClose);
                vh.setModel(that.oReferralOrderTreatmentOU);
                vh.open();
            }
        }
    },


    vhReferralOrderTreatOUClose: function(oEvent) {
        var oSelectedItem = oEvent.getParameter("selectedItem");
        if (oSelectedItem) {
            ga("send", "event", "ClinicalOVPhysician/PatientDashboard/ROTreatOUSel", "clicked");

            var referralOrderTreatmentOU = oSelectedItem.getTitle();
            that.referralOrderTreatmentOU = oSelectedItem.getDescription();
            var referralOrderTreatmentOUIp = sap.ui.getCore().byId("ID_CREATE_REFERRAL_ORDER_TREATMENT_OU");
            referralOrderTreatmentOUIp.setValue(referralOrderTreatmentOU);

            var referralOrderPhysicianIp = sap.ui.getCore().byId("ID_CREATE_REFERRAL_ORDER_PHYSICIAN");
            referralOrderPhysicianIp.setValue("");

            var sPath = "/ListValuesDTOSet?$filter=Lv_Alias eq 'UI_LV_REFERRAL_PHY' and Context/Institution eq 'RFH1' and Context/Department eq '" + that.referralOrderTreatmentOU + "'";

            that.oReferralOrderPhysician = new sap.ui.model.json.JSONModel({
                "ReferralOrderPhysicianData": []
            });

            com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelEMR, null, null, null, function(oData, oResponse, oRefData) {
                that.oReferralOrderPhysician.getData().ReferralOrderPhysicianData = oData.results;
                referralOrderPhysicianIp.setEnabled(true);
            }, function(oData, oResponse, oRefData) {
                that.oReferralOrderPhysician.getData().ReferralOrderPhysicianData = [];
                referralOrderPhysicianIp.setEnabled(true);
                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
            });
        }
    },

    vhReferralOrderTreatOUSearch: function(oEvent) {
        var sValue = oEvent.getParameter("value");
        var oDescFilter = new sap.ui.model.Filter("Lv_Descr", sap.ui.model.FilterOperator.Contains, sValue);
        var oKeyFilter = new sap.ui.model.Filter("Lv_Key", sap.ui.model.FilterOperator.Contains, sValue);
        var aFilters = [oDescFilter, oKeyFilter];
        var aOrFilter = [new sap.ui.model.Filter(aFilters, false)];
        oEvent.getSource().getBinding("items").filter(aOrFilter);
    },

    handleValueHelpReferralOrderPhysician: function() {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/ROPhyDiag", "clicked");
        var oItem = {
            Title: "{Lv_Descr}",
            Description: "{Lv_Key}"
        };

        if (!that.oReferralOrderPhysician || that.oReferralOrderPhysician.getData().ReferralOrderPhysicianData.length == 0) {
            that.oReferralOrderPhysician = new sap.ui.model.json.JSONModel({
                "ReferralOrderPhysicianData": []
            });
            var sPath = "/ListValuesDTOSet?$filter=Lv_Alias eq 'UI_LV_REFERRAL_PHY' and Context/Institution eq 'RFH1' and Context/Department eq '" + that.referralOrderTreatmentOU + "'";
            com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelEMR, null, null, null, function(oData, oResponse, oRefData) {
                that.oReferralOrderPhysician.getData().ReferralOrderPhysicianData = oData.results;
                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(that, "vhReferralOrderPhysician", "Physician", "/ReferralOrderPhysicianData", oItem, that.vhReferralOrderPhysicianSearch, that.vhReferralOrderPhysicianClose);
                vh.setModel(that.oReferralOrderPhysician);
                vh.open();
            }, function(oData, oResponse, oRefData) {
                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
            });
        } else {
            if (that.oReferralOrderPhysician.getData().ReferralOrderPhysicianData.length) {
                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(that, "vhReferralOrderPhysician", "Physician", "/ReferralOrderPhysicianData", oItem, that.vhReferralOrderPhysicianSearch, that.vhReferralOrderPhysicianClose);
                vh.setModel(that.oReferralOrderPhysician);
                vh.open();
            }
        }
    },


    vhReferralOrderPhysicianClose: function(oEvent) {
        var oSelectedItem = oEvent.getParameter("selectedItem");
        if (oSelectedItem) {
            ga("send", "event", "ClinicalOVPhysician/PatientDashboard/ROPhySel", "clicked");
            var referralOrderPhysician = oSelectedItem.getTitle();
            that.referralOrderPhysician = oSelectedItem.getDescription();
            var referralOrderPhysicianIp = sap.ui.getCore().byId("ID_CREATE_REFERRAL_ORDER_PHYSICIAN");
            referralOrderPhysicianIp.setValue(referralOrderPhysician);
        }
    },

    vhReferralOrderPhysicianSearch: function(oEvent) {
        var sValue = oEvent.getParameter("value");
        var oDescFilter = new sap.ui.model.Filter("Lv_Descr", sap.ui.model.FilterOperator.Contains, sValue);
        var oKeyFilter = new sap.ui.model.Filter("Lv_Key", sap.ui.model.FilterOperator.Contains, sValue);
        var aFilters = [oDescFilter, oKeyFilter];
        var aOrFilter = [new sap.ui.model.Filter(aFilters, false)];
        oEvent.getSource().getBinding("items").filter(aOrFilter);
    },

    handleReferralOrderReleaseButton: function() {
        var roTreatmentOU = sap.ui.getCore().byId("ID_CREATE_REFERRAL_ORDER_TREATMENT_OU").getValue();;
        var roPhysician = sap.ui.getCore().byId("ID_CREATE_REFERRAL_ORDER_PHYSICIAN").getValue();
        var roComment = sap.ui.getCore().byId('ID_CREATE_REFERRAL_ORDER_COMMENT').getValue();
        var patientData = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
        if (roTreatmentOU == "") {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_RO_TREATMENT_OU_MANDATORY"), "ERROR", "Alert");
            return false;
        }
        if (roPhysician == "") {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_RO_PHYSICIAN_MANDATORY"), "ERROR", "Alert");
            return false;
        }

        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/RORelease", "clicked");

        var data = {
            CaseId: that.selectedCaseAndTimeInterval.CaseId,
            Comment: roComment,
            Department: that.referralOrderTreatmentOU,
            Initiator_Treat_Ou: patientData.ThirdLine,
            Institution: "RFH1",
            User_Resp: that.referralOrderPhysician
        };

        var sPath = "/ReferralDTOSet";
        com.ril.hn.emrpatient.util.DataManager.createData(sPath, that.oModelEMR, null, null, data, null, function(oData, oResponse, oRefData) {
            sap.m.MessageToast.show(that.i18n.getText("TXT_RO_RELEASED_SUCCESS"));
            if (that.selectedCaseAndTimeInterval && that.selectedCaseAndTimeInterval.CaseId !== "") {
                sPath = "/ReferralOrderDisplaySet?$filter=Case eq '" + that.selectedCaseAndTimeInterval.CaseId + "'";
            }
            sPath = encodeURI(sPath);
            com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelScored, null, null, null, that.onReferralOrderReadSuccess, that.onReferralOrderReadError);
            com.ril.hn.emrpatient.util.Utility.onDialogClose(that, "CreateReferralOrder");
        }, function(oData, oResponse, oRefData) {
            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });

    },
    //----------End

    //------------ Allergies & Risk
    initAllergyAndRisksPanel: function() {
        that.oAllergies = new sap.ui.model.json.JSONModel({
            "AllergiesData": []
        });
        that.oRisks = new sap.ui.model.json.JSONModel({
            "RisksData": []
        });
        var sPathAlg = this.oDefaultParams.sEntityPath + "/Allergies";
        var sPathRis = this.oDefaultParams.sEntityPath + "/Risks";
        com.ril.hn.emrpatient.util.DataManager.readBatchData([sPathAlg, sPathRis], that.oModel, that.onAllergyAndRisksReadSuccess, that.onAllergyAndRisksReadError);
        that.initAllergiesStatus();
        sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES_AND_RISKS_PANEL").setExpanded(false);
    },

    onAllergyAndRisksReadSuccess: function(oData, oResponse, oRefData) {
        var batchError = '' , msg = "";
        for (var i = 0; i < oData.__batchResponses.length; i++) {
            if (oData.__batchResponses[i].message != null && oData.__batchResponses[i].statusCode != "200") {
                batchError = 'X';
                var m = JSON.parse(oData.__batchResponses[i].response.body);
				m = m.error.message.value;
				msg = msg + "\n" + m ;
                break;
            }
        }
        if (batchError !== 'X') {
            that.oAllergies.getData().AllergiesData = oData.__batchResponses[0].data.results;
            that.oRisks.getData().RisksData = oData.__batchResponses[1].data.results;
            that.initAllergiesData();
            that.initRisksData();
        } else {
           com.ril.hn.emrpatient.util.Utility.displayError(msg, "ERROR", "Alert");
        }
        sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES_AND_RISKS_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.oAllergies.getData().AllergiesData.length + that.oRisks.getData().RisksData.length));

    },

    onAllergyAndRisksReadError: function(oData, oResponse, oRefData) {
        for (var i = 0; i < oData.__batchResponses.length; i++) {
            if (oData.__batchResponses[i].message != null && oData.__batchResponses[i].statusCode != "200") {
                batchError = 'X';
                break;
            }
        }
        if (batchError !== 'X') {
            that.oAllergies.getData().AllergiesData = [];
            that.oRisks.getData().RisksData = [];
            that.initAllergiesData();
            that.initRisksData();
        } else {
            var msg = JSON.parse(oData.__batchResponses[i].response.body);
            msg = msg.error.message.value;
            com.ril.hn.emrpatient.util.Utility.displayError(msg, "ERROR", "Alert");
        }
        sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES_AND_RISKS_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.oAllergies.getData().AllergiesData.length + that.oRisks.getData().RisksData.length));

    },

    initAllergiesData: function() {
        var allergiesTitle = "";
        for (var i = 0; i < that.oAllergies.getData().AllergiesData.length; i++) {
            allergiesTitle = allergiesTitle + that.oAllergies.getData().AllergiesData[i].Allergen;
            if (i !== that.oAllergies.getData().AllergiesData.length - 1)
                allergiesTitle = allergiesTitle + ",";
        }
        sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES").setText(allergiesTitle);
        that.initAllergiesStatus(allergiesTitle);
    },


    initRisksData: function(entityPath) {
        var risksTitle = "";
        for (var i = 0; i < that.oRisks.getData().RisksData.length; i++) {
            risksTitle = risksTitle + that.oRisks.getData().RisksData[i].Name;
            if (i !== that.oRisks.getData().RisksData.length - 1)
                risksTitle = risksTitle + ",";
        }
        if (risksTitle === "")
            risksTitle = that.i18n.getText("TXT_NO_INFORMATION_AVAILABLE");
        sap.ui.getCore().byId("ID_PAT_DASH_RISKS").setText(risksTitle);
    },


    //---------------- Refresh allergies ----------------
    refreshAllergiesData: function() {
        if (that.isAllergyRefreshRequired) {
            var sPath = that.oDefaultParams.sEntityPath + "/Allergies";
            com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModel, null, null, null, function(oData, oResponse, oRefData) {
                that.oAllergies.getData().AllergiesData = oData.results;
                that.initAllergiesData();
            }, function(oData, oResponse, oRefData) {
                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
            });
        } else
            that.initAllergiesData();
        that.isAllergyRefreshRequired = false;
    },
    //---------------------- End ------------------------


    //------------------- Initialise allergy status -----------------
    initAllergiesStatus: function(allergiesTitle) {
        that.oAllergiesStatus = new sap.ui.model.json.JSONModel({
            "AllergiesStatusData": []
        });
        var sPath = "/AllergyInfoSet('" + sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].ExternalPatientId + "')";
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelEMR, null, null, {
            "allergiesTitle": allergiesTitle
        }, that.onAllergyStatusReadSuccess, that.onAllergyStatusReadError);
    },

    onAllergyStatusReadSuccess: function(oData, oResponse, oRefData) {
        that.oAllergiesStatus.getData().AllergiesStatusData = oData;
        var status = that.i18n.getText("TXT_ALLERGY_STATUS") + " : " + oData.StateTotalText;
        sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES_STATUS").setText(status);

        if (oData.StateTotalText !== "Allergies Exist")
            sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES_STATUS_CHANGE").setVisible(true);
        else
            sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES_STATUS_CHANGE").setVisible(false);
        var allergiesTitle = oRefData.allergiesTitle;
        if (allergiesTitle === "" && oData.StateTotalText !== "")
            sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES").setText(oData.StateTotalText);
        else if (allergiesTitle === "" && oData.StateTotalText == "")
            sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES").setText(that.i18n.getText("TXT_NO_INFORMATION_AVAILABLE"));
    },

    onAllergyStatusReadError: function(oData, oResponse, oRefData) {
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },
    //------------------------- End -----------------------------


    //----------------------- Change Allergy status ------------------------
    onAllergiesStatusChangeBtnPressed: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/AlrgyStatChPres", "clicked");
        var oButton = oEvent.getSource();
        com.ril.hn.emrpatient.util.Utility.onPopoverOpen(that, "fragment.EditAllergiesStatus", "EditAllergiesStatus", oButton);
        sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES_STATUS_CHANGE_RADGRP").setSelectedIndex(parseInt(that.oAllergiesStatus.getData().AllergiesStatusData.StateTotal - 1));
    },

    onAllergiesStatusChangeSave: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/AlrgyStatusChng", "clicked");
        var btn = sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES_STATUS_CHANGE_RADGRP");
        var patient = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
        if (btn.getSelectedIndex() !== -1) {
            var data = {
                "StateTotal": String(btn.getSelectedIndex() + 1),
                "Patientid": patient.ExternalPatientId,
                "StateTotalText": btn.getSelectedButton().getText()
            };
            var sPath = "AllergyInfoSet('" + patient.ExternalPatientId + "')";
            com.ril.hn.emrpatient.util.DataManager.updateData(sPath, that.oModelEMR, null, null, data, null, function(oData, oResponse, oRefData) {
                sap.m.MessageToast.show(that.i18n.getText("TXT_ALLERGIES_STATUS_CHANGED"));
                that.oAllergiesStatus.getData().AllergiesStatusData.StateTotalText = data.StateTotalText;
                that.oAllergiesStatus.getData().AllergiesStatusData.StateTotal = data.StateTotal;
                sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES_STATUS").setText(that.i18n.getText("TXT_ALLERGY_STATUS") + " : " + data.StateTotalText);
                sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES").setText(data.StateTotalText);
                com.ril.hn.emrpatient.util.Utility.onDialogClose(that, "EditAllergiesStatus");
            }, function(oData, oResponse, oRefData) {}, function(oData, oResponse, oRefData) {
                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
            });
        } else {
            sap.m.MessageToast.show(that.i18n.getText("TXT_VALID_STATUS_ERROR"));
        }
    },
    //------------------------ End ------------------------------------


    //----------------------------- Add allergy using api --------------------
    onAllergiesAddBtnPressed: function() {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/AlrgyCrePres", "clicked");
        var a = new ZHN_API.allergy.Allergy();
        var eb = sap.ui.getCore().getEventBus();
        eb.subscribe("ZHN_API", "AllergySave", that.onAllergyAddComplete, that);
        var patient = {
            Institution: "RFH1",
            PatientId: sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].ExternalPatientId,
            CaseNo: that.selectedCaseAndTimeInterval.CaseId
        };
        a.initAllergy(that, patient);
    },

    onAllergyAddComplete: function(channelId, eventId, data) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/AlrgyAddCompl", "clicked");
        var eb = sap.ui.getCore().getEventBus();
        if (data)
            sap.m.MessageToast.show(that.i18n.getText("TXT_ALLERGY_CREATE"));
        eb.unsubscribe("ZHN_API", "AllergySave", that.onAllergyAddComplete, that);
        that.isAllergyRefreshRequired = true;
        that.refreshAllergiesData();
    },
    //------------------------ End ------------------------------

    //---------------------- Display Allergies in a dialog ----------------
    onAllergiesTitlePress: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/OpenAllergies", "clicked");
        var patient = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
        var sPath = "AllergySet?$filter=ContextData/Patientid eq '" + patient.ExternalPatientId + "' and ContextData/Institution eq 'RFH1'";
        that.oAllergiesED = new sap.ui.model.json.JSONModel({
            "AllergiesEDData": []
        });
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelEMR, null, null, null, function(oData, oResponse, oRefData) {
            that.oAllergiesED.getData().AllergiesEDData = oData.results;
            com.ril.hn.emrpatient.util.Utility.onDialogOpen(that, "fragment.Allergies", "Allergies");
            com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, sap.ui.getCore().byId("ID_PAT_DASH_ALLERGIES_TABL"), that.getAllergiesTemplate(), that.oAllergiesED, "AllergiesEDData");

        }, function(oData, oResponse, oRefData) {
            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });
    },

    getAllergiesTemplate: function() {
        var oTempl = new sap.m.ColumnListItem({
            cells: [
                new sap.m.Text({
                    text: "{AllergyDescription}",
                    wrapping: true
                }),
                new sap.m.Text({
                    text: "{AllergyComment}",
                    wrapping: true
                }),
                new sap.m.Text({
                    text: "{AllergyCreatedBy}",
                    wrapping: true
                }),
                new sap.m.Text({
                    text: "{path: 'AllergyCreatedOn',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDate'}",
                    wrapping: true
                }),
                new sap.ui.layout.HorizontalLayout({
                    content: [new sap.ui.core.Icon({
                            src: "sap-icon://edit",
                            size: "1.2rem",
                            tooltip: that.i18n.getText("TXT_EDIT"),
                            press: that.onAllergyEditPressed
                        }).addStyleClass("sapUiContentPadding"),
                        new sap.ui.core.Icon({
                            src: "sap-icon://delete",
                            size: "1.2rem",
                            tooltip: that.i18n.getText("TXT_DELETE"),
                            press: that.onAllergyDeletePressed
                        }).addStyleClass("sapUiSmallMarginBegin sapUiContentPadding")
                    ]
                })
            ]
        });
        return oTempl;
    },
    //---------------------- End ---------------

    //--------------------- Display Risks in a dialog --------------------
    onRisksTitlePress: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/OpenRisks", "clicked");
        com.ril.hn.emrpatient.util.Utility.onDialogOpen(that, "fragment.Risks", "Risks");
        com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, sap.ui.getCore().byId("ID_PAT_DASH_RISKS_TABL"), that.getRisksTemplate(), that.oRisks, "RisksData");

    },

    getRisksTemplate: function() {
        var oTempl = new sap.m.ColumnListItem({
            cells: [
                new sap.m.Text({
                    text: "{Name}",
                    wrapping: true
                }),
                new sap.m.Text({
                    text: "{path: 'IndicationTimestamp',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDate'}",
                    wrapping: true
                })
            ]
        });
        return oTempl;
    },
    //------------------------ End --------------------------

    //------------- Edit Allergy Start --------------------
    onAllergyEditPressed: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/AlrgyEdBtnPres", "clicked");
        com.ril.hn.emrpatient.util.Utility.onDialogOpen(that, "fragment.EditAllergies", "EditAllergies");
        var context = oEvent.getSource().getBindingContext();
        var object = context.getObject(context.sPath);
        sap.ui.getCore().byId("ID_ALLERGY_EDIT_COMMENT").setValue(object.AllergyComment);
        var m = new sap.ui.model.json.JSONModel(object);
        that.EditAllergies.setModel(m, "SelectedAllergyEdit");
    },

    onAllergyEditSavePressed: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/AlrgyComntEdSav", "clicked");
        var object = that.EditAllergies.getModel("SelectedAllergyEdit").getData();
        var patientId = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].ExternalPatientId;
        var formatter = sap.ui.core.format.DateFormat.getDateInstance({
            pattern: "yyyy-mm-dd"
        });
        var date = formatter.format(new Date());
        var sPath = "AllergySet(AllergyId='" + object.AllergyId + "',Patientid='" + patientId + "')";
        object.AllergyComment = sap.ui.getCore().byId("ID_ALLERGY_EDIT_COMMENT").getValue();
        object.AllergyModifiedOn = date;
        object.ContextData = {
            Patientid: patientId,
            Institution: "RFH1"
        };
        object.Message = {
            MessageApp: "",
            MessageNumber: "000",
            MessageText: "",
            MessageType: ""
        };
        com.ril.hn.emrpatient.util.DataManager.updateData(sPath, that.oModelEMR, null, null, object, null, that.onAllergyEditSaveUpdateSuccess, function(oData, oResponse, oRefData) {
            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });
    },

    onAllergyEditSaveUpdateSuccess: function(oData, oResponse, oRefData) {
        sap.m.MessageToast.show(that.i18n.getText("TXT_ALLERGY_EDIT"));
        that.oAllergiesED.refresh(true);
        com.ril.hn.emrpatient.util.Utility.onDialogClose(that,"EditAllergies");
    },
    //-------------End

    //------------- Delete Allergy Start ----------------------------
    onAllergyDeletePressed: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/AllergyDel", "clicked");
        that.isAllergyRefreshRequired = true;
        var context = oEvent.getSource().getBindingContext();
        var object = context.getObject(context.sPath);
        var patient = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
        var sPath = "AllergySet(AllergyId='" + object.AllergyId + "',Patientid='" + patient.ExternalPatientId + "')";
        com.ril.hn.emrpatient.util.DataManager.removeData(sPath, that.oModelEMR, that, null, null, object, that.onAllergyRemoveSuccess, function(oData, oResponse, oRefData) {
            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });
    },

    onAllergyRemoveSuccess: function(oData, oResponse, oRefData) {
        var arr = that.oAllergiesED.getData().AllergiesEDData;
        arr.splice(arr.indexOf(oRefData), 1);
        that.oAllergiesED.refresh(true);
        sap.m.MessageToast.show(that.i18n.getText("TXT_ALLERGY_DELETE"));
    },
    //------------ End

    //--------------- Diagnosis 
    initDiagnosisPanel: function(bPanel) {
        that.oDiagnosis = new sap.ui.model.json.JSONModel({
            "DiagnosisData": []
        });
        var sPath = this.oDefaultParams.sEntityPath + "/Diagnoses" + that.oDefaultParams.sFilterPath;
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModel, null, null, null, that.onDiagnosisReadSuccess, that.onDiagnosisReadError);
        sap.ui.getCore().byId("ID_PAT_DASH_DIAGNOSIS_PANEL").setExpanded(bPanel);
    },

    onDiagnosisReadSuccess: function(oData, oResponse, oRefData) {
        that.oDiagnosis.getData().DiagnosisData = oData.results;
        that.initDiagnosisTable();
    },

    onDiagnosisReadError: function(oData, oResponse, oRefData) {
        that.oDiagnosis.getData().DiagnosisData = [];
        that.initDiagnosisTable();
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },

    initDiagnosisTable: function() {
        com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, sap.ui.getCore().byId("ID_PAT_DASH_DIAGNOSIS_TABL"), that.getDiagnosisTemplate(), that.oDiagnosis, "DiagnosisData");
        sap.ui.getCore().byId("ID_PAT_DASH_DIAGNOSIS_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.oDiagnosis.getData().DiagnosisData.length));
    },

    getDiagnosisTemplate: function() {
        var oTempl = new sap.m.ColumnListItem({
            cells: [
                new sap.m.ObjectIdentifier({
                    title: "{DiagnosisDescription}", //apply formatter
                    text: "{Code} {path: 'PrimaryDiagnosis',  formatter: 'com.ril.hn.emrpatient.util.Formatter.isPrimaryDiagnosis'}",
                    wrapping: true
                }),
                new sap.m.ObjectIdentifier({
                    title: "{path: 'ObservationTimestamp',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other'}",
                    wrapping: true
                })
            ]
        });
        return oTempl;
    },

    onDiagnosisCreateButtonPressed : function(){
		ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/DiagCre", "clicked");
		if(that.selectedCaseAndTimeInterval.CaseId !== ""){
			var srcPath = com.ril.hn.emrpatient.util.OrderManager.getDiagnosisCreateURL(sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0],that.selectedCaseAndTimeInterval,that.oWebFacets);
			com.ril.hn.emrpatient.util.Utility.openFioriAppInDialog(that,srcPath,that.getView().getModel("i18n").getResourceBundle().getText("TXT_DIAGNOSIS_PANEL"));
		}else{
				com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_VALID_CASE_ERROR"), "ERROR", "Alert");
			}
	},
    //-----------------End


    //---------------------Documents
    initDocumentsPanel: function() {
        that.oDocuments = new sap.ui.model.json.JSONModel({
            "DocumentsData": []
        });
        var sPath = "/DocumentListSet?$filter=Patient eq '" + sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].ExternalPatientId + "' and Case eq '" + that.selectedCaseAndTimeInterval.CaseId + "'";
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelScored, null, null, null, that.onDocumentsReadSuccess, that.onDocumentsReadError);
        sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_PANEL").setExpanded(false);
        sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_SEARCH").setValue("");
    },

    onDocumentsReadSuccess: function(oData, oResponse, oRefData) {
        that.oDocuments.getData().DocumentsData = oData.results;
        that.initDocumentsTable();
    },

    onDocumentsReadError: function(oData, oResponse, oRefData) {
        that.oDocuments.getData().DocumentsData = [];
        that.initPhysicianOrderTable();
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },

    initDocumentsTable: function() {
        com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_TABL"), that.getDocumentsTemplate(), that.oDocuments, "DocumentsData");
        sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.oDocuments.getData().DocumentsData.length));
        sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_FILTER").setSelectedKey("OPEN");
        var oFilter = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, "");
        sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_TABL").getBinding("items").filter([oFilter]);
    },

    getDocumentsTemplate: function() {
        var oTempl = new sap.m.ColumnListItem({
            cells: [
                new sap.ui.layout.VerticalLayout({
                    content: [new sap.m.Link({
                            text: "{Title}",
                            press: that.onDocummentLinkPressed,
                            emphasized: true,
                            wrapping: true
                        }).addStyleClass("sapUiContentPadding"),
                        new sap.m.ObjectStatus({
                            text: that.i18n.getText("TXT_CO_DEPARTMENT") + " : {path : 'ServiceDepartment' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getI18nText'}",
                            state: "None",
                            wrapping: true
                        }).addStyleClass("sapUiContentPadding")
                    ]
                }), new sap.ui.layout.VerticalLayout({
                    content: [new sap.m.Label({
                            text: "{path: 'Timestamp',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other'}",
                            design: "Bold",
                            wrapping: true
                        }).addStyleClass("sapUiContentPadding"),
                        new sap.m.ObjectStatus({
                            text: "{Status}",
                            state: "{path: 'Status', formatter: 'com.ril.hn.emrpatient.util.Formatter.getDocumentsStatus'}",
                            wrapping: true
                        }).addStyleClass("sapUiContentPadding")
                    ]
                }),
                new sap.ui.layout.HorizontalLayout({
                    content: [
                        new sap.ui.core.Icon({
                            src: "sap-icon://print",
                            size: "1.2rem",
                            color: "#595959",
                            tooltip: that.i18n.getText("TXT_PRINT"),
                            press: that.onDocummentPressed
                        }).addStyleClass("sapUiTinyMarginEnd"),
                        new sap.ui.core.Icon({
                            src: "sap-icon://sys-enter",
                            size: "1.2rem",
                            color: "#00a652",
                            tooltip: that.i18n.getText("TXT_APPROVAL"),
                            visible: "{path: 'Status', formatter: 'com.ril.hn.emrpatient.util.Formatter.getDocumentsApproveVisibility'}",
                            press: that.onDocumentsApprovePressed
                        }),
                    ]
                })
            ]

        });
        return oTempl;
    },

    onDocummentLinkPressed: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/openDoc", "clicked");
        com.ril.hn.emrpatient.util.Utility.onDialogOpen(that, "fragment.DocumentsVersionList", "DocumentsVersionList");
        var context = oEvent.getSource().getBindingContext();
        var object = context.getObject(context.sPath);
        that.getDocumentsVersionList(object);
    },

    getDocumentVersionTemplate: function() {
        var oTempl = new sap.m.ColumnListItem({
            cells: [
                new sap.m.Text({
                    text: "{Title}",
                    wrapping: true
                }),
                new sap.m.Text({
                    text: "{path : 'Id' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getDocumentDetails'}",
                    wrapping: true
                }),
                new sap.m.Text({
                    text: "{path : 'ServiceDepartment' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getI18nText'}",
                    wrapping: true
                }),
                new sap.m.ObjectStatus({
                    text: "{path: 'Status', formatter: 'com.ril.hn.emrpatient.util.Formatter.getDocumentsShortStatus'}",
                    wrapping: true
                }),
                new sap.m.Label({
                    text: "{path: 'Timestamp',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTimeOffest'}",
                    design: "Bold",
                    wrapping: true
                }),
                new sap.ui.core.Icon({
                    src: "sap-icon://print",
                    size: "1.2rem",
                    color: "#595959",
                    tooltip: that.i18n.getText("TXT_PRINT"),
                    press: that.onDocummentPressed
                })
            ]

        });
        return oTempl;
    },

    getDocumentsVersionList: function(object) {
        that.oDocVersList = new sap.ui.model.json.JSONModel({
            "DocumentsVersionListData": []
        });
        var sPath = "/ListOfDocumentsWithAllVersionsSet?$filter=ImDocumentid eq '" + object.Id + "'";
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelScored, null, null, null, function(oData, oResponse, oRefData) {
            that.oDocVersList.getData().DocumentsVersionListData = oData.results;
            that.oDocVersList.refresh(true);
            com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_VERSION_LIST_TABL"), that.getDocumentVersionTemplate(), that.oDocVersList, "DocumentsVersionListData");
        }, function(oData, oResponse, oRefData) {
            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });
    },

    onDocummentPressed: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/DocumntOpen", "clicked");
        var context = oEvent.getSource().getBindingContext();
        var object = context.getObject(context.sPath);
        var host = window.location.host;
        var src = window.location.protocol + "//" + window.location.host + that.oModelScored.sServiceUrl + "/DisplayDocumentSet('" + object.Id + "')/$value";
        if (host.search("qa") == -1 && host.search("dev") == -1) {
            src = src.replace("http://", "https://");
        }
        sap.m.URLHelper.redirect(src, true);
    },

    onDocumentsApprovePressed: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/DocApprove", "clicked");

        var context = oEvent.getSource().getBindingContext();
        var object = context.getObject(context.sPath);
        var sPath = "/ReleaseDocumentSet('" + object.Id + "')";
        if (object.Status === "In Work") {
            var data = {
                Key: ""
            };
            com.ril.hn.emrpatient.util.DataManager.updateData(sPath, that.oModelEMR, null, null, data, object, that.onDocumentApproveUpdateSuccess, that.onDocumentApproveUpdateReadError);
        } else if (object.Status === "Release") {
            sap.m.MessageToast.show(that.i18n.getText("TXT_DOCUMENTS_APPROVAL_RELEASE_STAT"));
        }
    },

    onDocumentApproveUpdateSuccess: function(oData, oResponse, oRefData) {
        sap.m.MessageToast.show(that.i18n.getText("TXT_DOCUMENTS_APPROVAL_SUCCESS"));
        oRefData.Status = "Release";
        that.oDocuments.refresh(true);
        sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.getInWorkDocuments()));

    },

    onDocumentApproveUpdateReadError: function(oData, oResponse, oRefData) {
        oRefData.Status = "In Work";
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },


    getInWorkDocuments: function() {
        function isInWork(object) {
            return object.Status == "In Work";
        }
        var inWorkDocs = that.oDocuments.getData().DocumentsData.filter(isInWork);
        return inWorkDocs.length;
    },

    handleDocumentsFilter: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/DocFiltr", "clicked");

        var documentStatus = oEvent.getSource().getSelectedKey();
        var sValue = sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_SEARCH").getValue();
        var aAndFilter = aOrFilter = null;
        //search documents according to title , description and department
        var oFilterTitle = new sap.ui.model.Filter("Title", sap.ui.model.FilterOperator.Contains, sValue);
        var oFilterShortText = new sap.ui.model.Filter("ShortText", sap.ui.model.FilterOperator.Contains, sValue);
        var oFilterDept = new sap.ui.model.Filter("ServiceDepartment", sap.ui.model.FilterOperator.Contains, sValue);
        var oFilterDocTyp = new sap.ui.model.Filter("DocumentGroup", sap.ui.model.FilterOperator.Contains, sValue);
        var oFilterStatus = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, documentStatus);
        aOrFilter = new sap.ui.model.Filter([oFilterTitle, oFilterShortText, oFilterDept, oFilterDocTyp], false);
        aAndFilter = new sap.ui.model.Filter([aOrFilter, oFilterStatus], true);
        var oBinding = sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_TABL").getBinding("items");
        oBinding.filter(aAndFilter);
    },
    
    handleDocumentsSearch : function(oEvent){
		var sValue = oEvent.getSource().getValue() ;
		var aAndFilter = aOrFilter = null;
		//search documents according to title , description and department
    	var oFilterTitle = new sap.ui.model.Filter("Title", sap.ui.model.FilterOperator.Contains, sValue);
    	var oFilterShortText = new sap.ui.model.Filter("ShortText", sap.ui.model.FilterOperator.Contains, sValue);
        var oFilterDept = new sap.ui.model.Filter("ServiceDepartment", sap.ui.model.FilterOperator.Contains, sValue);
        var oFilterDocTyp = new sap.ui.model.Filter("DocumentGroup", sap.ui.model.FilterOperator.Contains, sValue);
        var oFilterStatus = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_FILTER").getSelectedKey());
        aOrFilter = new sap.ui.model.Filter([oFilterTitle,oFilterShortText,oFilterDept,oFilterDocTyp],false);
        aAndFilter = new sap.ui.model.Filter([aOrFilter,oFilterStatus],true);
        var oBinding = sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_TABL").getBinding("items");
        oBinding.filter(aAndFilter);	
	},

    //----------------End

    //--------------Active medication
    initActiveMedicationPanel: function() {
        that.oActiveMed = new sap.ui.model.json.JSONModel({
            "ActiveMedData": []
        });
        //apply ip op case for spath
        var sPath = "ActiveMedicationSet?$filter= Case eq '" + that.selectedCaseAndTimeInterval.CaseId + "' and Indicator eq 'ACT'";;
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelScored, null, null, null, that.onActiveMedicationReadSuccess, that.onActiveMedicationReadError);
        sap.ui.getCore().byId("ID_PAT_DASH_ACTMED_PANEL").setExpanded(false);

    },

    onActiveMedicationReadSuccess: function(oData, oResponse, oRefData) {
        that.oActiveMed.getData().ActiveMedData = oData.results;
        that.initActiveMedicationTable();
    },

    onActiveMedicationReadError: function(oData, oResponse, oRefData) {
        that.oActiveMed.getData().ActiveMedData = [];
        that.initActiveMedicationTable();
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },

    initActiveMedicationTable: function() {
        var activeMedTable = sap.ui.getCore().byId("ID_PAT_DASH_ACTMED_TABL");
        com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, activeMedTable, that.getActiveMedicationTemplate(), that.oActiveMed, "ActiveMedData");
        sap.ui.getCore().byId("ID_PAT_DASH_ACTMED_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.oActiveMed.getData().ActiveMedData.length));

        var oBinding = activeMedTable.getBinding("items");
        // apply grouping
        var aSorters = [];
        var vGroup = function(oContext) {
            var name = oContext.getProperty("ClassDesc");
            return {
                key: name,
                text: name
            };
        };
        aSorters.push(new sap.ui.model.Sorter("ClassDesc", true, vGroup));
        aSorters.push(new sap.ui.model.Sorter("ToDate", true));
        oBinding.sort(aSorters);

        var filter = that.getFilterItems(that.oActiveMed.getData().ActiveMedData);
        var f = sap.ui.getCore().byId("ID_PAT_DASH_ACTMED_FILTER");
        f.setModel(new sap.ui.model.json.JSONModel({
            "FilterSet": filter
        }), "ActMedFilter");
        if (that.oActiveMed.getData().ActiveMedData.length > 0) {
            f.setSelectedKey(filter[0].OrderTypeDesc);
            var oFilter = new sap.ui.model.Filter("OrderTypeDesc", sap.ui.model.FilterOperator.Contains, filter[0].OrderTypeDesc);
            activeMedTable.getBinding("items").filter([oFilter]);
        }

    },

    getActiveMedicationTemplate: function() {
        var oTempl = new sap.m.ColumnListItem({
            cells: [
                new sap.ui.layout.VerticalLayout({
                    content: [new sap.m.Text({
                            text: "{OrderTypeDesc}",
                            state: "None",
                            wrapping: true
                        }).addStyleClass("sapUiContentPadding sapUiTinyMarginBottom sapUiTinyMarginTop"),
                        new sap.m.ObjectStatus({
                            //title : "{DrugDesc}",
                            text: "{DrugDesc}",
                            state: "{path : 'Cycle',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getMedStatusColor'}",
                            wrapping: true
                        }).addStyleClass("sapUiContentPadding"),
                    ]
                }), new sap.m.Text({
                    text: "{OrderStatus}",
                    wrapping: true
                }), new sap.m.Text({
                    text: "{path : 'FromDate',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDate'}",
                    wrapping: true
                }),
                new sap.m.Text({
                    text: "{path : 'ToDate',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDate'}",
                    wrapping: true
                })
            ]

        });
        return oTempl;
    },

    getFilterItems: function(arr) {
        var items = [];
        for (var i = 0; i < arr.length; i++) {
            var flag = false;
            for (var j = i + 1; j < arr.length; j++) {
                if (arr[i].OrderTypeDesc == arr[j].OrderTypeDesc) {
                    flag = true;
                }
            }
            if (!flag) {
                items.push({
                    "OrderTypeDesc": arr[i].OrderTypeDesc
                });
            }
        }
        for (var k = 0; k < items.length; k++) {
            if (items[k].OrderTypeDesc == "Inpatient") {
                var temp = items[0];
                items[0] = items[k];
                items[k] = temp;
                break;
            }
        }
        return items;
    },

    handleActiveMedicationFilter: function(oEvent) {
        var oFilter = new sap.ui.model.Filter("OrderTypeDesc", sap.ui.model.FilterOperator.Contains, oEvent.getSource().getSelectedKey());
        var oBinding = sap.ui.getCore().byId("ID_PAT_DASH_ACTMED_TABL").getBinding("items");
        oBinding.filter([oFilter]);
    },

    
    onMedicationButtonPressed : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/MedicationTrans", "clicked");
		if(that.selectedCaseAndTimeInterval.CaseId !== ""){
			var oPatient = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
		    com.ril.hn.emrpatient.util.OrderManager.onCreateMedicationOrder(oPatient,that.selectedCaseAndTimeInterval);
		
        }else{
        	com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_VALID_CASE_ERROR"), "INFORMATION", "Info");
                        return;
        }
	},
    //---------End

    //-------------- Progress Notes
    initProgressNotePanel: function(bPanel) {
        that.oProgressNotes = new sap.ui.model.json.JSONModel({
            "ProgressNotesData": []
        });
        //apply ip op case for spath
        var sPath = that.oDefaultParams.sEntityPath + "/ProgressNotes" + that.oDefaultParams.sFilterPath;
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModel, null, null, null, that.onProgressNoteReadSuccess, that.onProgressNoteReadError);
        sap.ui.getCore().byId("ID_PAT_DASH_PROGRESS_NOTES_PANEL").setExpanded(bPanel);
    },

    onProgressNoteReadSuccess: function(oData, oResponse, oRefData) {
        that.oProgressNotes.getData().ProgressNotesData = oData.results;
        that.initProgressNoteTable();
    },

    onProgressNoteReadError: function(oData, oResponse, oRefData) {
        that.oProgressNotes.getData().ProgressNotesData = [];
        that.initProgressNoteTable();
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },

    initProgressNoteTable: function() {
        var progNoteTable = sap.ui.getCore().byId("ID_PAT_DASH_PROGRESS_NOTE_TABL");
        com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, progNoteTable, that.getProgressNoteTemplate(), that.oProgressNotes, "ProgressNotesData");
        sap.ui.getCore().byId("ID_PAT_DASH_PROGRESS_NOTES_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.oProgressNotes.getData().ProgressNotesData.length));
        sap.ui.getCore().byId("ID_PAT_DASH_PROGRESS_NOTE_FILTER").setSelectedKey("");
    },

    getProgressNoteTemplate: function() {
        var oTempl = new sap.m.FeedListItem({
            enabled: false,
            value: "{NoteDescription}",
            showIcon: false,
            info: "{Title}",
            senderActive: false,
            sender: "{CreatorName} ({CreatorProfession})",
            timestamp: "{ path: 'ObservationTimestamp',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other'}",
            text: "{NoteDescription}"
        });
        return oTempl;
    },

    handleProgressNotesFilter: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/PNFilter", "clicked");
        var creatorProfession = oEvent.getSource().getSelectedKey();
        var oFilter = "";
        if (creatorProfession == "") {
            oFilter = new sap.ui.model.Filter("CreatorProfession", sap.ui.model.FilterOperator.Contains, "");
        } else {
            oFilter = new sap.ui.model.Filter("CreatorProfession", sap.ui.model.FilterOperator.EQ, creatorProfession);
        }
        var oBinding = sap.ui.getCore().byId("ID_PAT_DASH_PROGRESS_NOTE_TABL").getBinding("items");
        oBinding.filter([oFilter]);

    },

    handleCreateProgressNote: function() {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/PNCreDiag", "clicked");
        com.ril.hn.emrpatient.util.Utility.onDialogOpen(this, "fragment.CreateProgressNote", "CreateProgressNote");
        sap.ui.getCore().byId("ID_PROGRESS_NOTE_CATEGORY").setValue("");
        sap.ui.getCore().byId("ID_PROGRESS_NOTE_TEXT").setValue("");
        sap.ui.getCore().byId("ID_PROGRESS_NOTE_DATETIME").setDateValue(new Date());
    },


    /*On save check all mandatory fields , 
     * if yes send progress note to backend */
    handleProgressNoteSaveButton: function() {
        var patientid = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
        var progressCategory = sap.ui.getCore().byId("ID_PROGRESS_NOTE_CATEGORY").getValue();
        var progressNoteObsTime = sap.ui.getCore().byId("ID_PROGRESS_NOTE_DATETIME").getDateValue();

        if (progressCategory == "") {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_CATEGORY_MANDATORY"), "ERROR", "Alert");
            return false;
        }
        var progressNoteText = sap.ui.getCore().byId('ID_PROGRESS_NOTE_TEXT').getValue();
        if (progressNoteText == "") {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_COMMENT_MANDATORY"), "ERROR", "Alert");
            return false;
        }
        if (!progressNoteObsTime) {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_DATE_TIME_MANDATORY"), "ERROR", "Alert");
            return false;
        } else if (progressNoteObsTime && (progressNoteObsTime.getTime() > new Date().getTime())) {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_DATE_TIME_MANDATORY_FUT_DATE"), "ERROR", "Alert");
            return false;
        } else if (progressNoteObsTime && patientid.DateOfAdmission) {
            //observation time should be between past 3 days or admission date whichever is less
            var admPeriod = Math.abs((patientid.DateOfAdmission.getTime() - new Date().getTime()) / (24 * 3600 * 1000));
            var obsPeriod = Math.abs((progressNoteObsTime.getTime() - new Date().getTime()) / (24 * 3600 * 1000));
            if (admPeriod >= 3 && !(obsPeriod <= 3)) {
                com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_DATE_TIME_MANDATORY_72HRS"), "ERROR", "Alert");
                return false;
            } else if (admPeriod <= 3 && !(admPeriod >= obsPeriod)) {
                com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_DATE_TIME_MANDATORY_ADM_DATE"), "ERROR", "Alert");
                return false;
            }
        } else if (progressNoteObsTime && !patientid.DateOfAdmission) {
            //if admission date is null than check only past 3 days condition
            var obsPeriod = Math.abs((progressNoteObsTime.getTime() - new Date().getTime()) / (24 * 3600 * 1000));
            if (!(obsPeriod < 3)) {
                com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_DATE_TIME_MANDATORY_72HRS"), "ERROR", "Alert");
                return false;
            }
        }

        //send creator role blank
        var data = {
            NoteDescription: progressNoteText,
            CreatorRole: "",
            CategoryId: that.selectedPrgsNoteCatLabel,
            ObservationTimestamp: progressNoteObsTime,
        };

        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/PNSave", "clicked");

        var sPath = that.oDefaultParams.sEntityPath + "/ProgressNotes";
        com.ril.hn.emrpatient.util.DataManager.createData(sPath, that.oModel, null, null, data, null, function(oData, oResponse, oRefData) {
            sap.m.MessageToast.show(that.i18n.getText("TXT_PN_SAVED"));
            sPath = sPath + that.oDefaultParams.sFilterPath;
            //com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModel, null, null, null, that.onProgressNoteReadSuccess, that.onProgressNoteReadError);
            that.initProgressNotePanel(true);
            com.ril.hn.emrpatient.util.Utility.onDialogClose(that, "CreateProgressNote");
        }, function(oData, oResponse, oRefData) {
            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });


    },


    //Initialise and open progress notes value help dialog
    handleValueHelpProgressNoteCategory: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/PNCatDiag", "clicked");
        var oItem = {
            Title: "{Name}",
            Description: "{Id}"
        };
        if (that.oProgressNoteCat) {
            if (that.oProgressNoteCat.getData().ProgressNoteCatData.length) {
                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(that, "vhProgressNote", "Category", "/ProgressNoteCatData", oItem, that.vhProgressNotesSearch, that.vhProgressNotesClose);
                vh.setModel(that.oProgressNoteCat);
                vh.open();
            }
        } else {
            that.oProgressNoteCat = new sap.ui.model.json.JSONModel({
                "ProgressNoteCatData": []
            });
            com.ril.hn.emrpatient.util.DataManager.readData("/ProgressNoteCategoryCollection", that.oModel, null, null, null, function(oData, oResponse, oRefData) {
                that.oProgressNoteCat.getData().ProgressNoteCatData = oData.results;
                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(that, "vhProgressNote", "Category", "/ProgressNoteCatData", oItem, that.vhProgressNotesSearch, that.vhProgressNotesClose);
                vh.setModel(that.oProgressNoteCat);
                vh.open();
            }, function(oData, oResponse, oRefData) {
                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
            });
        }
    },

    //close progress notes value help dialog and show selected category
    vhProgressNotesClose: function(oEvent) {
        var oSelectedItem = oEvent.getParameter("selectedItem");
        if (oSelectedItem) {
            ga("send", "event", "ClinicalOVPhysician/PatientDashboard/PNCatSel", "clicked");
            that.selectedPrgsNoteCatLabel = oSelectedItem.getDescription();
            var progressNoteCategory = sap.ui.getCore().byId("ID_PROGRESS_NOTE_CATEGORY");
            progressNoteCategory.setValue(oSelectedItem.getTitle());
        }
    },

    //Value help searching
    vhProgressNotesSearch: function(evt) {
        var sValue = evt.getParameter("value");
        var oNameFilter = new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sValue);
        evt.getSource().getBinding("items").filter([oNameFilter]);
    },

    //-------------End

    //------------- Dietary 
    initDietaryPanel: function() {
        that.oDietary = new sap.ui.model.json.JSONModel({
            "DietaryData": []
        });
        var sPath = "";
        var patientData = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
        if (that.selectedCaseAndTimeInterval && that.selectedCaseAndTimeInterval.CaseId !== "") {
            sPath = "GetRecordSet?$filter=Einri eq 'RFH1' and Falnr eq '" + that.selectedCaseAndTimeInterval.CaseId + "' and Patnr eq '" + patientData.ExternalPatientId + "'";
        } else {
            sPath = "GetRecordSet?$filter=Einri eq 'RFH1' and  Patnr eq '" + patientData.ExternalPatientId + "'";
        }
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelDietary, null, null, null, that.onDietaryReadSuccess, that.onDietaryReadError);
        sap.ui.getCore().byId("ID_PAT_DASH_DIETARY_PANEL").setExpanded(false);
    },

    onDietaryReadSuccess: function(oData, oResponse, oRefData) {
        that.oDietary.getData().DietaryData = oData.results;
        that.initDietaryTable();
    },

    onDietaryReadError: function(oData, oResponse, oRefData) {
        that.oDietary.getData().DietaryData = [];
        that.initDietaryTable();
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },

    initDietaryTable: function() {
        com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, sap.ui.getCore().byId("ID_PAT_DASH_DIETARY_TABL"), that.getDietaryTemplate(), that.oDietary, "DietaryData");
        sap.ui.getCore().byId("ID_PAT_DASH_DIETARY_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.oDietary.getData().DietaryData.length));
    },

    getDietaryTemplate: function() {
        var oTempl = new sap.m.ColumnListItem({
            cells: [new sap.m.ObjectIdentifier({
                    title: "{ZzDietgrpTxt} - {ZzDiettypTxt}",
                    text: "{ZzRemarks}",
                    wrapping: true
                }),
                new sap.m.ObjectIdentifier({
                    title: "{parts : [{path: 'ZzDietDate'},{path: 'ZzDietTime'}],  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateTimeForDietary'}",
                    wrapping: true
                })
            ]
        });
        return oTempl;
    },

    handleCreateDietary: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/DietCreDiag", "clicked");
        if (that.selectedCaseAndTimeInterval && that.selectedCaseAndTimeInterval.CaseId !== "") {
            com.ril.hn.emrpatient.util.Utility.onDialogOpen(that, "fragment.CreateDietary", "CreateDietary");
            sap.ui.getCore().byId("ID_CREATE_DIETARY_DIET_GROUP").setValue("");
            sap.ui.getCore().byId("ID_CREATE_DIETARY_DIET_TYPE").setValue("");
            sap.ui.getCore().byId("ID_CREATE_DIETARY_DIET_TYPE").setEnabled(false);
            sap.ui.getCore().byId("ID_CREATE_DIETARY_REMARK").setValue("");
        } else
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_VALID_CASE_ERROR"), "ERROR", "Alert");
    },

    handleValueHelpDietaryDietGroup: function() {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/DietGrpDiag", "clicked");
        var oItem = {
            Title: "{ZzDietgrpTxt}",
            Description: "{Zzdietgroup}"
        };
        if (that.oDietaryDietGroup) {
            if (that.oDietaryDietGroup.getData().DietaryDietGroupData.length) {
                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(that, "vhDietaryGrp", "Diet Group", "/DietaryDietGroupData", oItem, that.vhDietaryGrpSearch, that.vhDietaryGrpClose);
                vh.setModel(that.oDietaryDietGroup);
                vh.open();
            }
        } else {
            that.oDietaryDietGroup = new sap.ui.model.json.JSONModel({
                "DietaryDietGroupData": []
            });
            com.ril.hn.emrpatient.util.DataManager.readData("/DietGroupSet", that.oModelDietary, null, null, null, function(oData, oResponse, oRefData) {
                that.oDietaryDietGroup.getData().DietaryDietGroupData = oData.results;
                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(that, "vhDietaryGrp", "Diet Group", "/DietaryDietGroupData", oItem, that.vhDietaryGrpSearch, that.vhDietaryGrpClose);
                vh.setModel(that.oDietaryDietGroup);
                vh.open();
            }, function(oData, oResponse, oRefData) {
                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
            });
        }
    },


    vhDietaryGrpClose: function(oEvent) {
        var oSelectedItem = oEvent.getParameter("selectedItem");
        if (oSelectedItem) {
            ga("send", "event", "ClinicalOVPhysician/PatientDashboard/DietGrpSel", "clicked");

            var dietaryDietGroup = oSelectedItem.getTitle();
            that.dietaryDietGroup = oSelectedItem.getDescription();
            var dietaryDietGroupIp = sap.ui.getCore().byId("ID_CREATE_DIETARY_DIET_GROUP");
            dietaryDietGroupIp.setValue(dietaryDietGroup);
            var dietaryDietTypeIp = sap.ui.getCore().byId("ID_CREATE_DIETARY_DIET_TYPE");
            dietaryDietTypeIp.setValue("");

            var sPath = "/DietTypeSet?$filter=Zzdietgroup eq '" + that.dietaryDietGroup + "'";

            that.oDietaryDietType = new sap.ui.model.json.JSONModel({
                "DietaryDietTypeData": []
            });
            com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelDietary, null, null, null, function(oData, oResponse, oRefData) {
                that.oDietaryDietType.getData().DietaryDietTypeData = oData.results;
                dietaryDietTypeIp.setEnabled(true);
            }, function(oData, oResponse, oRefData) {
                that.oDietaryDietType.getData().DietaryDietTypeData = [];
                dietaryDietTypeIp.setEnabled(true);
                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
            });
        }
    },

    vhDietaryGrpSearch: function(evt) {
        var sValue = evt.getParameter("value");
        var oNameFilter = new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sValue);
        evt.getSource().getBinding("items").filter([oNameFilter]);

    },

    handleValueHelpDietaryDietType: function() {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/DietTypDiag", "clicked");
        var oItem = {
            Title: "{ZzDiettypTxt}",
            Description: "{Zzdiettype}"
        };
        if (that.oDietaryDietType) {
            if (that.oDietaryDietType.getData().DietaryDietTypeData.length) {
                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(that, "vhDietaryTyp", "Diet Type", "/DietaryDietTypeData", oItem, that.vhDietaryTypSearch, that.vhDietaryTypClose);
                vh.setModel(that.oDietaryDietType);
                vh.open();
            }
        } else {
            that.oDietaryDietGroup = new sap.ui.model.json.JSONModel({
                "DietaryDietTypeData": []
            });
            var sPath = "/DietTypeSet?$filter=Zzdietgroup eq '" + that.dietaryDietGroup + "'";
            com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModel, null, null, null, function(oData, oResponse, oRefData) {
                that.oDietaryDietType.getData().DietaryDietTypeData = oData.results;
                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(that, "vhDietaryTyp", "Diet Type", "/DietaryDietTypeData", oItem, that.vhDietaryTypSearch, that.vhDietaryTypClose);
                vh.setModel(that.oDietaryDietType);
                vh.open();
            }, function(oData, oResponse, oRefData) {
                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
            });
        }
    },


    vhDietaryTypClose: function(oEvent) {
        var oSelectedItem = oEvent.getParameter("selectedItem");
        if (oSelectedItem) {
            ga("send", "event", "ClinicalOVPhysician/PatientDashboard/DietTypSel", "clicked");
            var dietaryDietType = oSelectedItem.getTitle();
            that.dietaryDietType = oSelectedItem.getDescription();
            var dietaryDietTypeIp = sap.ui.getCore().byId("ID_CREATE_DIETARY_DIET_TYPE");
            dietaryDietTypeIp.setValue(dietaryDietType);
        }
    },

    vhDietaryTypSearch: function(evt) {
        var sValue = evt.getParameter("value");
        var oNameFilter = new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sValue);
        evt.getSource().getBinding("items").filter([oNameFilter]);
    },

    handleDietaryAddButton: function() {
        var dietGroup = sap.ui.getCore().byId("ID_CREATE_DIETARY_DIET_GROUP").getValue();;
        var dietType = sap.ui.getCore().byId("ID_CREATE_DIETARY_DIET_TYPE").getValue();
        var remark = sap.ui.getCore().byId('ID_CREATE_DIETARY_REMARK').getValue();
        var patientData = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
        if (dietGroup == "") {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_DIETARY_DIETGROUP_MANDATORY"), "ERROR", "Alert");
            return false;
        }
        if (dietType == "") {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_DIETARY_DIETTYPE_MANDATORY"), "ERROR", "Alert");
            return false;
        }

        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/DietaryAdd", "clicked");

        var data = {
            Einri: "RFH1",
            Falnr: that.selectedCaseAndTimeInterval.CaseId,
            Patnr: patientData.ExternalPatientId,
            Zzdietgroup: that.dietaryDietGroup,
            ZzDiettyp: that.dietaryDietType,
            ZzRemarks: remark,
            ZzDietDate: null,
            ZzDietTime: null
        };

        var sPath = "/GetRecordSet";
        com.ril.hn.emrpatient.util.DataManager.createData(sPath, that.oModelDietary, null, null, data, null, function(oData, oResponse, oRefData) {
            sap.m.MessageToast.show(that.i18n.getText("TXT_DIETARY_ADD_SUCCESS"));
            if (that.selectedCaseAndTimeInterval && that.selectedCaseAndTimeInterval.CaseId !== "") {
                sPath = "GetRecordSet?$filter=Einri eq 'RFH1' and Falnr eq '" + that.selectedCaseAndTimeInterval.CaseId + "' and Patnr eq '" + patientData.ExternalPatientId + "'";
            } else {
                sPath = "GetRecordSet?$filter=Einri eq 'RFH1' and  Patnr eq '" + patientData.ExternalPatientId + "'";
            }
            sPath = encodeURI(sPath);
            com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelDietary, null, null, null, that.onDietaryReadSuccess, that.onDietaryNoteReadError);
            com.ril.hn.emrpatient.util.Utility.onDialogClose(that, "CreateDietary");
        }, function(oData, oResponse, oRefData) {
            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });

    },

    //--------End

    //-------- Patient Data
    initPatientDataPanel: function(entityPath) {
        var patientsDataSf = sap.ui.getCore().byId("ID_PAT_DASH_PATIENT_DATA_SF");
        that.oPatientPersonalData = new sap.ui.model.json.JSONModel({
            "PatientPersonalData": []
        });
        that.oPatientNextKinData = new sap.ui.model.json.JSONModel({
            "PatientNextKinData": []
        });
        that.oPatientPhysicianData = new sap.ui.model.json.JSONModel({
            "PatientPhysicianData": []
        });
        that.oPatientInsuranceData = new sap.ui.model.json.JSONModel({
            "PatientInsuranceData": []
        });
        that.oPatientEmployerData = new sap.ui.model.json.JSONModel({
            "PatientEmployerData": []
        });
        var aPaths = [];
        aPaths.push(that.oDefaultParams.sEntityPath + "/Contacts");
        aPaths.push(that.oDefaultParams.sEntityPath + "/NextKins");
        aPaths.push(that.oDefaultParams.sEntityPath + "/Physicians");
        aPaths.push(that.oDefaultParams.sEntityPath + "/InsuranceData");
        aPaths.push(that.oDefaultParams.sEntityPath + "/Employers");
        com.ril.hn.emrpatient.util.DataManager.readBatchData(aPaths, that.oModel, function(oData, oResponse, oRefData) {
            var batchError = '', msg ="";
            for (var i = 0; i < oData.__batchResponses.length; i++) {
                if (oData.__batchResponses[i].message != null && oData.__batchResponses[i].statusCode != "200") {
                    batchError = 'X';
                    var m = JSON.parse(oData.__batchResponses[i].response.body);
					m = m.error.message.value;
					msg = msg + "\n" + m ;
                    break;
                }
            }
            if (batchError !== 'X') {
                that.oPatientPersonalData.getData().PatientPersonalData = oData.__batchResponses[0].data.results;
                patientsDataSf.setModel(that.oPatientPersonalData, "PatientPersonalDataModel");
                patientsDataSf.bindElement("PatientPersonalDataModel>/PatientPersonalData/0");

                that.oPatientNextKinData.getData().PatientNextKinData = oData.__batchResponses[1].data.results;
                patientsDataSf.setModel(that.oPatientNextKinData, "PatientNextKinDataModel");
                patientsDataSf.bindElement("PatientNextKinDataModel>/PatientNextKinData/0");

                that.oPatientPhysicianData.getData().PatientPhysicianData = oData.__batchResponses[2].data.results;
                patientsDataSf.setModel(that.oPatientPhysicianData, "PatientPhysicianDataModel");
                patientsDataSf.bindElement("PatientPhysicianDataModel>/PatientPhysicianData/0");

                that.oPatientInsuranceData.getData().PatientInsuranceData = oData.__batchResponses[3].data.results;
                patientsDataSf.setModel(that.oPatientInsuranceData, "PatientInsuranceDataModel");
                patientsDataSf.bindElement("PatientInsuranceDataModel>/PatientInsuranceData/0");

                that.oPatientEmployerData.getData().PatientEmployerData = oData.__batchResponses[4].data.results;
                patientsDataSf.setModel(that.oPatientEmployerData, "PatientEmployerDataModel");
                patientsDataSf.bindElement("PatientEmployerDataModel>/PatientEmployerData/0");
            } else {
               com.ril.hn.emrpatient.util.Utility.displayError(msg, "ERROR", "Alert");
            }
        }, function(oData, oResponse, oRefData) {
            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });
        sap.ui.getCore().byId("ID_PAT_DASH_PATIENT_DATA_PANEL").setExpanded(false);
    },
    //------- End

    //-------- Other activities
    initOtherActivitiesPanel: function() {
        sap.ui.getCore().byId("ID_PAT_DASH_OTHER_ACTIVITIES_PANEL").setExpanded(false);
    },
    //-------- End

    //--------- Ad hoc services
    initAdhocServicesPanel: function() {
        that.oAdhocServices = new sap.ui.model.json.JSONModel({
            "AdhocServicesData": []
        });
        var sPath = "/AssignServDTOSet?$filter=Institution eq 'RFH1' and  Orgid  eq '" + sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].ThirdLine + "' and CaseID eq '" + that.selectedCaseAndTimeInterval.CaseId + "'";
        sPath = encodeURI(sPath);
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelEMR, null, null, null, that.onAdhocServicesReadSuccess, that.onAdhocServicesReadError);
        sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_PANEL").setExpanded(false);
    },

    onAdhocServicesReadSuccess: function(oData, oResponse, oRefData) {
        that.oAdhocServices.getData().AdhocServicesData = oData.results;
        that.initAdhocServicesTable();
    },

    onAdhocServicesReadError: function(oData, oResponse, oRefData) {
        that.oAdhocServices.getData().AdhocServicesData = [];
        that.initAdhocServicesTable();
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },

    initAdhocServicesTable: function() {
        com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_TABL"), that.getAdhocServicesTemplate(), that.oAdhocServices, "AdhocServicesData");
        sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.oAdhocServices.getData().AdhocServicesData.length));
    },

    getAdhocServicesTemplate: function() {
        var oTempl = new sap.m.ColumnListItem({
            cells: [
                new sap.m.ObjectIdentifier({
                    title: "{Service_Desc}",
                    wrapping: true
                }),
                new sap.m.ObjectIdentifier({
                    title: "{parts : [{path : 'Serv_date'}, {path : 'Serv_time'}] ,  formatter: 'com.ril.hn.emrpatient.util.Formatter.getConcatenatedDateAndTime'}",
                    wrapping: true
                })
            ]
        });
        return oTempl;
    },
    
    onAdhocServicesAssignButtonPressed : function(oEvent){
		if(that.selectedCaseAndTimeInterval && that.selectedCaseAndTimeInterval.CaseId !== ""){
				var patientData =  sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0] ;
				var sPath = "/AdhocDTOSet?$filter=Institution eq 'RFH1' and  Orgid  eq '" + patientData.ThirdLine + "' and CaseID eq '" + that.selectedCaseAndTimeInterval.CaseId + "'" ;
				com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelEMR, null, null, null, function(oData, oResponse, oRefData) {
					   that.getModifiedAdhocServicesList(oData.results);
					   com.ril.hn.emrpatient.util.Utility.onDialogOpen(that, "fragment.AssignAdhocServices", "AssignAdhocServices");
				       that.initAdhocServicesAssignDialog();
	            }, function(oData, oResponse, oRefData) {
	                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
	            });
		}else{
			sap.m.MessageToast.show(that.i18n.getText("TXT_VALID_CASE_ERROR"));
		}
	},
	
	getModifiedAdhocServicesList : function(results){
		that.oAdhocServicesList = new sap.ui.model.json.JSONModel({"AdhocServicesListData" : []   });
		that.oAdhocGroupsList = new sap.ui.model.json.JSONModel({"AdhocGroupsListData" : []   });
		that.oAdhocGroupsList.getData().AdhocGroupsListData[0] = {
				Institution:"RFH1",
				NodeID:"",
				Orgfa:"",
				Orgid:"",
				ParentNode:"",
				Serv_date:"",
				Serv_is_assign:false,
				Serv_is_group:true,
				Serv_is_perform:false,
				Serv_time:"",
				Service_Desc:"All",
				Service_ID:""
			};
		for(var i=0 ; i<results.length ; i++){
			var obj = results[i];
			if(obj.Serv_is_group){
				that.oAdhocGroupsList.getData().AdhocGroupsListData[that.oAdhocGroupsList.getData().AdhocGroupsListData.length] = obj; 
			}
			if(obj.Serv_is_perform){
				that.oAdhocServicesList.getData().AdhocServicesListData[that.oAdhocServicesList.getData().AdhocServicesListData.length] = obj; 
			}
		}
	},
	
	initAdhocServicesAssignDialog : function(){
		if(that.AssignAdhocServices){
			com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_LIST_TABL"), that.getAssignAdhocServicesTemplate(), that.oAdhocServicesList, "AdhocServicesListData");
		    sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_GRP_LIST").setValue("");
			var selBtn = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SELECTED_COUNT");
			selBtn.setText(that.i18n.getText("TXT_ADHOC_SERVICES_SELECTED_COUNT",[0]));
		}
	},
	
	getAssignAdhocServicesTemplate  :function(){
		 var oTempl = new sap.m.ColumnListItem({
				cells : [
				         new sap.m.Text({
				        	 text : "{Service_Desc}", 
				        	 wrapping: true
				         }),
				         new sap.m.Text({
				        	 text : "{path : 'ParentNode' ,  formatter: 'com.ril.hn.emrpatient.util.Formatter.getAdhocParentDesc'}",
				        	 wrapping: true
				         })] 
				         
			});
	        return oTempl;
	},
	
	handleAdhocServiceSearch : function(oEvent){
		var sValue = oEvent.getSource().getValue() ;
        var oFilterName = new sap.ui.model.Filter("Service_Desc", sap.ui.model.FilterOperator.Contains, sValue);
        var oFilterId = new sap.ui.model.Filter("Service_ID", sap.ui.model.FilterOperator.Contains, sValue);
        var aFilters = [oFilterName,oFilterId];
        var aOrFilter = [new sap.ui.model.Filter(aFilters,false)];
        sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_LIST_TABL").getBinding("items").filter(aOrFilter);	
	},
	
	onServiceSelectionChange : function(oEvent){
		var items = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_LIST_TABL").getSelectedContextPaths().length;
		sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SELECTED_COUNT").setText(that.i18n.getText("TXT_ADHOC_SERVICES_SELECTED_COUNT",[items]));
	},
	
	handleAdhocServicesSelectedPressed : function(){
		ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/AdhocSel", "clicked");
		var items = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_LIST_TABL").getSelectedContextPaths();
		that.oAdhocSelServicesList = new sap.ui.model.json.JSONModel({"AdhocSelServicesListData" : []});
		$.each(items,function(i,item){
			that.oAdhocSelServicesList.getData().AdhocSelServicesListData[i] = that.oAdhocServicesList.getObject(items[i]);
		});
		if(items.length>0){
			 com.ril.hn.emrpatient.util.Utility.onDialogOpen(that, "fragment.EditAssignAdhocServices", "EditAssignAdhocServices");
			 com.ril.hn.emrpatient.util.UiControlManager.initTableControl(that, sap.ui.getCore().byId("ID_PAT_DASH_SELECTED_ADHOC_SERVICES_LIST_TABL"), that.getEditAssignAdhocServicesTemplate(), that.oAdhocSelServicesList, "AdhocSelServicesListData");
		}else{
			sap.m.MessageToast.show(that.i18n.getText("TXT_NO_SERV_SELECTED"));
		}
	},
	
	getEditAssignAdhocServicesTemplate  :function(){
		 var oTempl = new sap.m.ColumnListItem({
				cells : [
				         new sap.m.Text({
				        	 text : "{Service_Desc}", 
				        	 wrapping: true
				         }),
				         new sap.m.DateTimeInput({
				        	 //value : "{parts : [{path : 'Serv_date'},{path : 'Serv_time'} ],  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateTimeForDietary'}",
				        	 value : com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other(new Date()),
				        	 displayFormat : "dd.MM.yyyy HH:mm",
				        	 valueFormat :"dd.MM.yyyy HH:mm",
				        	 wrapping: true,
				        	 type : "DateTime",
				        	 change : that.onAdHocServDateTimeChange
				         }),
				         new sap.ui.core.Icon({
				        	 src : "sap-icon://delete" ,
				        	 size : "1.2rem",
				        	 color : "#595959" ,
				        	 press : that.onAdhocServiceDeletePressed 
				         })] ,
				         press : that.onServiceSelectionChange,
				         type : "Active"
				         
			});
	        return oTempl;
	},
	
	onAdhocServiceDeletePressed : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/AdhocDel", "clicked");
		var ind = oEvent.getSource().getBindingContext().sPath.split("/")[2];
		that.oAdhocSelServicesList.getData().AdhocSelServicesListData.splice(ind,1);
		that.oAdhocSelServicesList.refresh(true);
	},
	
	onAdHocServDateTimeChange : function(oEvent){
		var evt = oEvent.getSource();
		var admisnDate = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].DateOfAdmission.getTime();
		if((evt.getDateValue().getTime() > new  Date().getTime()) || (evt.getDateValue().getTime() < admisnDate)){
			evt.setValueState("Error");
			evt.setValueStateText(that.i18n.getText("TXT_INVALID_DATE_ADHOC_RELEASE"));
			sap.m.MessageToast.show(that.i18n.getText("TXT_INVALID_DATE_ADHOC_RELEASE"));
		}else{
			evt.setValueState("None");
		}
	},
	
	onAdhocServiceAddPressed : function(oEvent){
		//add service to list only if date entered is previous 
		ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/AdhocAdd", "clicked");
		
		var serviceSelect = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_LIST");
    	var dateTime = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_DATETIME");
    	
    	var selectedDateTime = dateTime.mProperties.dateValue.getTime() ;
    	var currentDateTime = new Date().getTime() ;
    	
    	if(selectedDateTime <= currentDateTime){
	    		var data =  {
	        			"Leist": serviceSelect.getSelectedItem().getKey() ,
	    				"Serv_date": com.ril.hn.emrpatient.util.Formatter.getFormattedDateForAdhoc(dateTime.mProperties.dateValue),
	    				"Serv_time": com.ril.hn.emrpatient.util.Formatter.getFormattedTimeForAdhoc(dateTime.mProperties.dateValue),
	    				"Serv_Desc": serviceSelect.getSelectedItem().getText()
	        	};
	        	
	        	that.oSelectedAdhocServices.getData().SelectedAdhocServicesData[that.oSelectedAdhocServices.getData().SelectedAdhocServicesData.length] = data ;
	        	that.oSelectedAdhocServices.refresh(true);
	        	
	        	dateTime.setValueState("None");
	        	
	        	var selectedList = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_ASSIGNED_LIST");
	        	selectedList.setHeaderText(that.i18n.getText("TXT_ADHOC_SERVICES_ASSIGNED_SERVICES") + " (" + that.oSelectedAdhocServices.getData().SelectedAdhocServicesData.length + ")");
	       	}else{
	       		dateTime.setValueState("Error");
	       		dateTime.setValueStateText(that.i18n.getText("TXT_FUTURE_DATE_ERROR"));
	       		sap.m.MessageToast.show(that.i18n.getText("TXT_FUTURE_DATE_ERROR"));
	       	}
    	},
	
	handleAdhocServicesReleasePressed : function(oEvent){
		// release selected services by putting in a batch call
		ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/AdhocRel", "clicked");
		
		if(that.oAdhocSelServicesList.getData().AdhocSelServicesListData.length > 0){
			var patientData =  sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0] ;
			var batchChanges = []; 
			var sPath = "/ReleaseServSet";
			var items = sap.ui.getCore().byId("ID_PAT_DASH_SELECTED_ADHOC_SERVICES_LIST_TABL").getItems();
			var admisnDate = patientData.DateOfAdmission.getTime();
			for(var j=0 ; j<items.length ; j++){
				if((items[j].getCells()[1].getDateValue().getTime() > new Date().getTime()) || (items[j].getCells()[1].getDateValue().getTime() < admisnDate)){
					com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_INVALID_DATE_ADHOC_RELEASE"), "ERROR", "Alert");
					return;
				}
			}
			
			//add common to all services properties and remove service description from list 
			for(var i=0 ; i<that.oAdhocSelServicesList.getData().AdhocSelServicesListData.length ; i++){
				var object = that.oAdhocSelServicesList.getData().AdhocSelServicesListData[i] , data = {};
				data.Institution = "RFH1";
				data.Orgid = patientData.WardId ;
				data.PatientID = patientData.ExternalPatientId;
				data.CaseID = that.selectedCaseAndTimeInterval.CaseId ;
				data.Orgfa = patientData.ThirdLine ;
				data.Leist = object.Service_ID ;
				data.Serv_date = com.ril.hn.emrpatient.util.Formatter.getFormattedDateForAdhoc(items[i].getCells()[1].getDateValue());
				data.Serv_time = com.ril.hn.emrpatient.util.Formatter.getFormattedTimeForAdhoc(items[i].getCells()[1].getDateValue());
				batchChanges.push( that.oModelEMR.createBatchOperation(sPath,"POST", data)); 
			}
			
			that.oModelEMR.addBatchChangeOperations(batchChanges);
			that.oModelEMR.submitBatch(function(oData, oResponse) { 
				var batchError = '' , msg = "" , m = "";
				for (var i = 0 ; i<oData.__batchResponses.length ; i++){
					if(oData.__batchResponses[i].message !=null && oData.__batchResponses[i].statusCode!="200"){
						batchError='X';
						if(oData.__batchResponses[i].response){
							   m = JSON.parse(oData.__batchResponses[i].response.body);
						       m = m.error.message.value;
						   }
						msg = msg + "\n" + m ;
					}
				}
				if(batchError=='X'){
					com.ril.hn.emrpatient.util.Utility.displayError(msg, "ERROR", "Alert");
					return;
				}else{
					sap.m.MessageToast.show(that.i18n.getText("TXT_SERVICES_RELEASE_SUCCESS"));
					com.ril.hn.emrpatient.util.Utility.onDialogClose(that, "EditAssignAdhocServices");
					com.ril.hn.emrpatient.util.Utility.onDialogClose(that, "AssignAdhocServices");
					//refresh the adhoc service panel
				    sPath = "/AssignServDTOSet?$filter=Institution eq 'RFH1' and  Orgid  eq '" + patientData.ThirdLine + "' and CaseID eq '" + that.selectedCaseAndTimeInterval.CaseId + "'" ;
					that.oModelEMR.read(sPath,null,null,false, function(oData, oResponse){ 
						   that.oAdhocServices.getData().AdhocServicesData =  oData.results ;
						   that.oAdhocServices.refresh(true);
						},function(oData, oResponse){
							com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
						});
				}
			} , function(oData, oResponse) { 
				com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
			});
		}else{
			sap.m.MessageToast.show(that.i18n.getText("TXT_NO_SERVICES_TO_RELEASE_ERROR"));
		}
		
	},
    //--------- End


    //---------------------- Treatment Sheet

    _onTreatmentSheetButtonPressed: function() {
        com.ril.hn.emrpatient.util.Utility.onDialogOpen(this, "fragment.PrintTreatmentSheet", "PrintTreatmentSheet");
        sap.ui.getCore().byId("ID_TREATMENT_SHEET_DATE").setDateValue(new Date());
        sap.ui.getCore().byId("ID_TREATMENT_SHEET_DATE").setValueState("None");
    },

    onPrintTreatmentSheetOKPressed: function() {
        if (sap.ui.getCore().byId("ID_TREATMENT_SHEET_DATE").getDateValue()) {
            var patientDetails = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].CurrentLocation;
            var selectedDate = that.dateTimeFormat(sap.ui.getCore().byId("ID_TREATMENT_SHEET_DATE").getDateValue());
            var sPath = "/TreatmentSheetPrintSet(Case='" + that.oCasesAndTimeIntervals.getData().CasesAndTimeIntervalsData[0].CaseId +
                "',Bed='" + patientDetails.split(" ")[3] +
                "',TreatmentOu='" + patientDetails.split(" ")[1] +
                "',Date=datetime'" + selectedDate + "')/$value";
            com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelScored, null, null, null, function(oData, oResponse, oRefData) {
                sap.m.URLHelper.redirect(oResponse.requestUri, "true");
                com.ril.hn.emrpatient.util.Utility.onDialogClose(that, "PrintTreatmentSheet");
            }, function(oData, oResponse, oRefData) {
                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
                com.ril.hn.emrpatient.util.Utility.onDialogClose(that, "PrintTreatmentSheet");
            });
        } else {
            sap.ui.getCore().byId("ID_TREATMENT_SHEET_DATE").setValueState("Error");
            sap.ui.getCore().byId("ID_TREATMENT_SHEET_DATE").setValueStateText("Please select a date");
        }
    },

    dateTimeFormat: function(value) {
        var _smonth;
        var _sdate;
        var formatDate;
        if (value == null) {
            return null;
        }
        _smonth = value.getMonth() + 1;
        _sdate = value.getDate();
        if (_smonth.toString().length < 2) {
            _smonth = "0" + _smonth.toString();
        }
        if (_sdate.toString().length < 2) {
            _sdate = "0" + _sdate.toString();
        }
        formatDate = value.getFullYear() + '-' + _smonth + '-' + _sdate + "T00:00:00";
        return formatDate;
    },

    //---------------------- End 

    //------------------------ History & Assessments
    _onHistoryAndAssessmentButtonPressed: function() {
        var patientHeader = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0]
        var allergyStatus = com.ril.hn.emrpatient.util.Formatter.getAllergyStatusCode(that.oAllergiesStatus.getData().AllergiesStatusData.StateTotalText);
        var data = {
            AddmDate: patientHeader.DateOfAdmission,
            AddmPhysician: patientHeader.AdmittingPhy,
            Age: "",
            AttPhysician: patientHeader.AttendingPhy,
            Case: sap.ui.getCore().getModel("CasesAndTimeIntervalsDrModel").getData().CasesAndTimeIntervalsData[0].CaseId,
            DeptOU: patientHeader.CurrentLocation.split(" ")[0],
            Favourite: "",
            Gender: com.ril.hn.emrpatient.util.Formatter.getPatientGender(patientHeader.Gender),
            IDeptOU: "",
            MarkedDischrg: "",
            PatientDOB: new Date(patientHeader.Birthdate),
            PatientName: patientHeader.NameLabel,
            PatientNo: parseInt(patientHeader.ExternalPatientId).toString(),
            TreatOU: patientHeader.WardId,
            Room: patientHeader.CurrentLocation.split(" ")[2],
            Bed: patientHeader.CurrentLocation.split(" ")[3],
            AllergyStatus: allergyStatus,
            RiskFactor: patientHeader.Attention
        };

        var patientModel = new sap.ui.model.json.JSONModel({
            "PatientDetail": data
        });
        sap.ui.getCore().setModel(patientModel, "PatientBasicInfo");

        //destroy fragments before navigating
        that.destroyAllFragments();

        sap.ui.getCore().getModel("RefreshScreenModel").getData().Refresh = true;

        var navigationService = sap.ushell.Container.getService("CrossApplicationNavigation");
        navigationService.toExternal({
            target: {
                semanticObject: "ZHN",
                action: "HistoryAndAssessment&/OPDASScore(" + data.Case + ")"
            }
        });
    },
    //----------------------- End

    //---------------------- Refresh ui
    _onRefreshAllButtonPressed: function() {
    	that.initPanelsData();
    },
    //------------------------ End

    //----------------- Planned Discharge
    _onPlannedDischargeButtonPressed: function() {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/DischrgBtnPress", "clicked");
        if (that.selectedCaseAndTimeInterval.CaseId !== "") {
            com.ril.hn.emrpatient.util.Utility.onDialogOpen(that, "fragment.PlannedDischarge", "PlannedDischarge");
            var endDate = that.selectedCaseAndTimeInterval.EndDate;
            if (endDate == null) {
                sap.ui.getCore().byId("ID_PLANNED_DISCHARGE_DATETIME").setValue("");
                sap.ui.getCore().byId("ID_PLANNED_DISCHARGE_CORETITLE").setText("");
                sap.ui.getCore().byId("ID_PLANNED_DISCHARGE_NOTE").setValue("");
                return;
            } else {
                var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
                    pattern: "dd MMM YYYY HH:mm"
                });
                var TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;
                var timezone = ((new Date(endDate)).getTime() + TZOffsetMs);
                endDate = new Date(timezone);
                var endDateNew = oDateFormat.format(endDate);
                var currentDate = oDateFormat.format(new Date());
                var caseDt = (new Date(endDateNew)).getTime();
                var currDt = (new Date(currentDate)).getTime();
                if (caseDt > currDt) {
                    sap.ui.getCore().byId("ID_PLANNED_DISCHARGE_CORETITLE").setText(endDateNew);
                    sap.ui.getCore().byId("ID_PLANNED_DISCHARGE_DATETIME").setDateValue(endDate);
                    var sPath = "/PatCaseDischargeInfoCollection(Institution='RFH1',PatCaseId='" + that.selectedCaseAndTimeInterval.CaseId + "')";
                    com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModelDischarge, null, null, null, function(oData, oResponse, oRefData) {
                        sap.ui.getCore().byId("ID_PLANNED_DISCHARGE_NOTE").setValue(oData.DischargeComment);
                    }, function(oData, oResponse, oRefData) {
                        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
                    });

                } else {
                    sap.ui.getCore().byId("ID_PLANNED_DISCHARGE_CORETITLE").setText("");
                    sap.ui.getCore().byId("ID_PLANNED_DISCHARGE_DATETIME").setDateValue("");
                    sap.ui.getCore().byId("ID_PLANNED_DISCHARGE_NOTE").setValue("");
                }
            }
        } else {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_VALID_CASE_ERROR"), "ERROR", "Alert");
        }
    },

    onPlannedDischargeSavePressed: function() {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/DischrgSave", "clicked");
        var noteText = sap.ui.getCore().byId("ID_PLANNED_DISCHARGE_NOTE").getValue();
        var dateTime = sap.ui.getCore().byId("ID_PLANNED_DISCHARGE_DATETIME").getDateValue();
        if (dateTime == null) {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_DATE_TIME_MANDATORY"), "ERROR", "Alert");
            return false;
        }
        if (noteText == "") {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_COMMENT_MANDATORY"), "ERROR", "Alert");
            return false;
        }
        var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
            pattern: "YYYY-MM-ddTHH:mm:ss"
        });
        var caseEndDateNew = oDateFormat.format(dateTime);
        var timefrmt;
        var oDateFormat2 = sap.ui.core.format.DateFormat.getDateInstance({
            pattern: "HH:mm:ss"
        });
        if (that.selectedCaseAndTimeInterval.EndDate == null) {
            endDate = caseEndDateNew;
            timefrmt = oDateFormat2.format(dateTime);
        } else {
            endDate = that.selectedCaseAndTimeInterval.EndDate;
            timefrmt = oDateFormat2.format(dateTime);
        }
        var hrs = timefrmt.split(":")[0];
        var min = timefrmt.split(":")[1];
        var sec = timefrmt.split(":")[2];
        var seltime = "P" + 00 + "DT" + hrs + "H" + min + "M" + sec + "S";
        var data = {
            Institution: "RFH1",
            PatCaseId: that.selectedCaseAndTimeInterval.CaseId,
            PatientId: sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].ExternalPatientId,
            DischargeDate: caseEndDateNew,
            DischargeTime: seltime,
            DischargeStatus: "P",
            DischargeComment: noteText,
            ExtCommentExists: "",
            NoDischarge: "",
            DateEditable: "",
            CommentEditable: ""
        };
        var sPath = "/PatCaseDischargeInfoCollection(Institution='RFH1',PatCaseId='" + that.selectedCaseAndTimeInterval.CaseId + "')";
        com.ril.hn.emrpatient.util.DataManager.updateData(sPath, that.oModelDischarge, null, null, data, null, function(oData, oResponse, oRefData) {
            var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
                pattern: "dd MMM YYYY HH:mm"
            });
            sap.ui.getCore().byId("ID_PLANNED_DISCHARGE_CORETITLE").setText(oDateFormat.format(dateTime));
            that.selectedCaseAndTimeInterval.EndDate = dateTime;
            com.ril.hn.emrpatient.util.Utility.onDialogClose(that, "PlannedDischarge");
            sap.m.MessageToast.show(that.i18n.getText("TXT_PLANNED_DISCHARGE_SAVED_SUCCESS"));
        }, function(oData, oResponse, oRefData) {
            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });
    },
    //----------------- End

    //------------------- Charts
    initChartsPanel: function() {
        that.oChartBP = new sap.ui.model.json.JSONModel({
            "ChartDataBP": []
        });
        that.oChartHR = new sap.ui.model.json.JSONModel({
            "ChartDataHR": []
        });
        that.oChartTemp = new sap.ui.model.json.JSONModel({
            "ChartDataTemp": []
        });
        sap.ui.getCore().byId("ID_PAT_DASH_CHARTS_STATUS").setText("");
        var sPath = that.oDefaultParams.sEntityPath + "/VitalSigns" + that.oDefaultParams.sFilterPath;
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, that.oModel, null, null, null, function(oData, oResponse, oRefData) {
            that.segregateChartsVitals(oData);
            that.initBloodPressure();
            that.initHeartRate();
            that.initTemperature();
            if (that.oChartBP.getData().ChartDataBP.length == 0 && that.oChartHR.getData().ChartDataHR.length == 0 && that.oChartTemp.getData().ChartDataTemp.length == 0)
                sap.ui.getCore().byId("ID_PAT_DASH_CHARTS_STATUS").setText(that.i18n.getText("TXT_NO_CHARTS"));
            sap.ui.getCore().byId("ID_PAT_DASH_CHARTS_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.oChartBP.getData().ChartDataBP.length + that.oChartHR.getData().ChartDataHR.length + that.oChartTemp.getData().ChartDataTemp.length));
        }, function(oData, oResponse, oRefData) {
            that.segregateChartsVitals(oData);
            sap.ui.getCore().byId("ID_PAT_DASH_CHARTS_STATUS").setText(that.i18n.getText("TXT_NO_CHARTS"));
            sap.ui.getCore().byId("ID_PAT_DASH_CHARTS_INDICATOR").setVisible(false);

            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
        });
        sap.ui.getCore().byId("ID_PAT_DASH_CHART_PANEL").setExpanded(false);
    },

    segregateChartsVitals: function(oData) {
        var oTemp = [],
            oHeartRate = [],
            oSystPress = [],
            oDiasPress = [];
        // Separate data for different types , add extra proprty for bar graph with value 0
        for (var i = 0; i < oData.results.length; i++) {
            switch (oData.results[i].Type) {
                case "BODY_TEMP":
                    oData.results[i]['ValueBar'] = 0;
                    oTemp[oTemp.length] = oData.results[i];
                    break;
                case "HEART_RATE":
                    oData.results[i]['ValueBar'] = 0;
                    oHeartRate[oHeartRate.length] = oData.results[i];
                    break;
                case "SYST_PRESS":
                    oData.results[i]['ValueBar'] = 0;
                    oSystPress[oSystPress.length] = oData.results[i];
                    break;
                case "DIAS_PRESS":
                    oData.results[i]['ValueBar'] = 0;
                    oDiasPress[oDiasPress.length] = oData.results[i];
                    break;
            }
        }
        that.combineBPVitals(oSystPress, oDiasPress);
        that.oChartHR.getData().ChartDataHR = oHeartRate;
        that.oChartTemp.getData().ChartDataTemp = oTemp;
    },

    combineBPVitals: function(oSystPress, oDiasPress) {
        var dias_syst = [];
        if (oSystPress.length != 0 && oDiasPress.length != 0) {
            for (var x = 0; x < oSystPress.length; x++) {
                for (var y = 0; y < oDiasPress.length; y++) {
                    if (((oDiasPress[y].Timestamp).toString() == (oSystPress[x].Timestamp).toString())) {
                        dias_syst[dias_syst.length] = {
                            "Timestamp": oSystPress[x].Timestamp,
                            "SystValue": oSystPress[x].Value,
                            "DiasValue": oDiasPress[y].Value
                        };
                    }
                }
            }
        } else if (oSystPress.length != 0 && oDiasPress.length == 0) {
            for (var x = 0; x < oSystPress.length; x++) {
                dias_syst[dias_syst.length] = {
                    "Timestamp": oSystPress[x].Timestamp,
                    "SystValue": oSystPress[x].Value,
                    "DiasValue": ""
                };
            }

        } else if (oSystPress.length == 0 && oDiasPress.length != 0) {
            for (var x = 0; x < oDiasPress.length; x++) {
                dias_syst[dias_syst.length] = {
                    "Timestamp": oDiasPress[x].Timestamp,
                    "SystValue": "",
                    "DiasValue": oDiasPress[x].Value
                };
            }
        }
        that.oChartBP.getData().ChartDataBP = dias_syst;
    },

    initBloodPressure: function() {
        that.oVizFrameBP = sap.ui.getCore().byId("ID_VIZ_FRAME_BP");
        that.oVizFrameBP.destroyFeeds();
        that.oVizFrameBP.setVisible(true);
        that.oPopOverBP = sap.ui.getCore().byId("ID_POP_OVER_BP");

        var oDimension = [{
            name: "Date and Time",
            value: "{path: 'Timestamp', formatter:  'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other'}"
        }];
        var oMeasure = [{
            name: 'Legend',
            value: '{ValueBar}'
        }, {
            name: 'Syst BP',
            value: "{path : 'SystValue' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getChartValue'}"
        }, {
            name: 'Dias BP',
            value: "{path : 'DiasValue' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getChartValue'}"
        }];
        com.ril.hn.emrpatient.util.UiControlManager.initChartsControl(that, that.oVizFrameBP, that.oPopOverBP, oDimension, oMeasure, that.i18n.getText("TXT_BLOODPRESSURE_CHART_TITLE"), "ChartDataBP");
        if (that.oChartBP.getData().ChartDataBP.length == 0) {
            that.oVizFrameBP.setVisible(false);
        }
        that.oVizFrameBP.setModel(that.oChartBP);
    },

    initHeartRate: function() {
        that.oVizFrameHeart = sap.ui.getCore().byId("ID_VIZ_FRAME_HR");
        that.oVizFrameHeart.destroyFeeds();
        that.oVizFrameHeart.setVisible(true);
        that.oPopOverHeart = sap.ui.getCore().byId("ID_POP_OVER_HR");

        var oDimension = [{
            name: 'Date and Time',
            value: "{path: 'Timestamp', formatter:  'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other'}"
        }];
        var oMeasure = [{
            name: 'Legend',
            value: '{ValueBar}'
        }, {
            name: 'Pulse',
            value: "{path : 'Value' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getChartValue'}"
        }];
        com.ril.hn.emrpatient.util.UiControlManager.initChartsControl(that, that.oVizFrameHeart, that.oPopOverHeart, oDimension, oMeasure, that.i18n.getText("TXT_HEARTRATE_CHART_TITLE"), "ChartDataHR");
        if (that.oChartHR.getData().ChartDataHR.length == 0) {
            that.oVizFrameHeart.setVisible(false);
        }
        that.oVizFrameHeart.setModel(that.oChartHR);
    },

    initTemperature: function() {
        that.oVizFrameTemp = sap.ui.getCore().byId("ID_VIZ_FRAME_TEMP");
        that.oVizFrameTemp.destroyFeeds();
        that.oVizFrameTemp.setVisible(true);
        that.oPopOverTemp = sap.ui.getCore().byId("ID_POP_OVER_TEMP");

        var oDimension = [{
            name: 'Date and Time',
            value: "{path: 'Timestamp', formatter:  'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other'}"
        }];
        var oMeasure = [{
            name: 'Legend',
            value: '{ValueBar}'
        }, {
            name: 'Temp',
            value: "{path : 'Value' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getChartValue'}"
        }];
        com.ril.hn.emrpatient.util.UiControlManager.initChartsControl(that, that.oVizFrameTemp, that.oPopOverTemp, oDimension, oMeasure, that.i18n.getText("TXT_TEMPERATURE_CHART_TITLE"), "ChartDataTemp");
        if (that.oChartTemp.getData().ChartDataTemp.length == 0) {
            that.oVizFrameTemp.setVisible(false);
        }
        that.oVizFrameTemp.setModel(that.oChartTemp);
    },
    
    handleVitalsAddBtnPress : function(){
		ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/VitalCre", "clicked");
		
		//destroy fragments before navigating
		that.destroyAllFragments() ;
        sap.ui.getCore().getModel("RefreshScreenModel").getData().Refresh = true ;
        var pat = that.getView().getModel("PatientHeader").getData().Patient[0];
		var caseNo="";
		if(that.selectedCaseAndTimeInterval.CaseId !== ""){
			caseNo = that.selectedCaseAndTimeInterval.CaseId;
		}else{
			caseNo = that.oCasesAndTimeIntervals.getData().CasesAndTimeIntervalsData[0].CaseId;
		}
		var risk = pat.Attention;
		var allergyStatus = com.ril.hn.emrpatient.util.Formatter.getAllergyStatusCode(that.oAllergiesStatus.getData().AllergiesStatusData.StateTotalText);
		var navigationService = sap.ushell.Container.getService("CrossApplicationNavigation");
		navigationService.toExternal({
			target : { //semanticObject : "ZHN" , action: "Vital_Sign&/VitalsCreateDisplay/"+caseNo}
			//params : { patID: pId, wardID: pWardId, patientName: pName , sPath : sPath}
			shellHash: "#ZHN-Vital_Sign?Patient="+com.ril.hn.emrpatient.util.Formatter.trimExtPatientId(pat.ExternalPatientId).toString()+"&Case="+caseNo+"&PatientName="+pat.NameLabel+"&Sex="+pat.Gender+"&Birthdate="+new Date(pat.Birthdate.replace(/-/g, "/")).getTime()+
	        "&DeptOu="+pat.ThirdLine.split(" ")[0]+"&TreatOu="+pat.WardId+"&AttPhy="+pat.AttendingPhy+"&MovDate="+pat.DateOfAdmission.getTime()+"&admittingPhy="+pat.AdmittingPhy+"&room="+pat.CurrentLocation.split(" ")[2]+"&bed="+pat.CurrentLocation.split(" ")[3]+"&riskFactor="+risk+"&allergyStatus="+allergyStatus+"&/VitalsCreateDisplay/"+caseNo
			}
		});
	},
	
	onVitalsChartsFullScreenPressed : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/VitalsFullscreen", "clicked");
		
		var json = "" ;
		/* ashwini change start*/
		/*if(!that.selectedCaseAndTimeInterval.CaseId){*/
		if(that.selectedCaseAndTimeInterval.CaseId !== ""){
		/* ashwini change end */
		    json = that.selectedCaseAndTimeInterval;
		}else{
			json = that.oCasesAndTimeIntervals.getData().CasesAndTimeIntervalsData[0];
		}
		var oIndex = new sap.ui.model.json.JSONModel({"SelectedCasesAndTimeIntervalsData" : json  });
		sap.ui.getCore().setModel( oIndex , "SelectedCasesAndTimeIntervalsDrVCModel");
		
		var object = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
		var entityValue = "PatientCollection('"+ object.Id + "')";
		
		that._oRouter.navTo("PatientsVitalsCharts", {entity : entityValue} , false );
	},
	
    //-------------------- End

    //---------------------- Lab Results
    initLabResultsPanel: function() {
        that.oLabResultMeasureTypes = new sap.ui.model.json.JSONModel({
            "LabResultMeasureTypesData": []
        });
        that.oLabResults = new sap.ui.model.json.JSONModel({
            "LabResultsData": []
        });
        that.oLabResultMeasurementInfos = new sap.ui.model.json.JSONModel({
            "LabResultMeasurementInfosData": []
        });
        that.FinalLabResults = new sap.ui.model.json.JSONModel({
            "FinalLabResults": []
        });
        var sPathMT = this.oDefaultParams.sEntityPath + "/LabResultMeasureTypes" + that.oDefaultParams.sFilterPath;
        var sPathLR = this.oDefaultParams.sEntityPath + "/LabResults" + that.oDefaultParams.sFilterPath;
        com.ril.hn.emrpatient.util.DataManager.readBatchData([sPathMT, sPathLR], that.oModel, that.onLabResultsReadSuccess, that.onLabResultsReadError);
        sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_PANEL").setExpanded(false);
    },

    onLabResultsReadSuccess: function(oData, oResponse, oRefData) {
        that.oLabResultMeasureTypes.getData().LabResultMeasureTypesData = oData.__batchResponses[0].data.results;
        that.oLabResults.getData().LabResultsData = com.ril.hn.emrpatient.util.Formatter.getLRHHMMTimestamp("Timestamp", oData.__batchResponses[1].data.results);
        that.oLabResultMeasurementInfos.getData().LabResultMeasurementInfosData = that.getUniqueTimestamps(oData.__batchResponses[1].data.results);
        that.FinalLabResults.getData().FinalLabResults = com.ril.hn.emrpatient.util.LabResultsManager.getFinalLabResults(that.oLabResults, that.oLabResultMeasureTypes, that.oLabResultMeasurementInfos);
        if (that.FinalLabResults.getData().FinalLabResults.length > 0) {
            that.initLabResultsTable();
        } else {
            var labResultsTable = sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_TABL");
            labResultsTable.removeAllColumns();
            labResultsTable.removeAllItems();
            labResultsTable.destroyItems();
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_LEFT").setVisible(false);
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_RIGHT").setVisible(false);
            sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_INDICATOR").setVisible(false);
            sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_PANEL").setExpanded(false);
        }
    },

    onLabResultsReadError: function(oData, oResponse, oRefData) {
        that.FinalLabResults.getData().FinalLabResults = [];
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },

    getUniqueTimestamps: function(data) {
        var arr = [];
        if (data.length > 0) {
            data = com.ril.hn.emrpatient.util.Formatter.getLRHHMMTimestamp("Timestamp", data);
            arr[0] = data[0];
            for (var i = 0; i < data.length; i++) {
                for (var j = 0; j < arr.length; j++) {
                    if ((data[i].Timestamp.getTime() !== arr[j].Timestamp.getTime()) && (j == (arr.length - 1))) {
                        arr[arr.length] = data[i];
                    }
                }
            }
        }
        return arr;
    },

    initLabResultsTable: function() {
        var labResultsTable = sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_TABL");
        labResultsTable.removeAllColumns();
        labResultsTable.removeAllItems();
        labResultsTable.destroyItems();

        var columnListItem = [] , timestamps = that.oLabResultMeasurementInfos.getData().LabResultMeasurementInfosData;
        var ts = that.oLabResultMeasurementInfos.getData().LabResultMeasurementInfosData.length;

        // Set visibility for scroll buttons
        if (ts <= 2) {
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_LEFT").setVisible(false);
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_RIGHT").setVisible(false);
        } else {
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_LEFT").setVisible(true);
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_LEFT").setEnabled(false);
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_RIGHT").setVisible(true);
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_RIGHT").setEnabled(true);
        }

        // Create columns headers template
        for (var i = 0; i <= ts; i++) {
            var c = "";
            if (i !== 0) {
                var d = com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other(timestamps[i - 1].Timestamp);
                var visible = (i == 1 || i == 2) ? true : false;
                c = new sap.m.Column({
                    hAlign: "Center",
                    visible: visible,
                    header: new sap.m.Label({
                        text: d,
                        wrapping: true
                    })
                });
            } else {
                c = new sap.m.Column({
                    hAlign: "Left",
                    header: new sap.m.Label({
                        text: "Test",
                        wrapping: true
                    })
                });
            }
            labResultsTable.addColumn(c);;
        }

        // Create column list items template
        for (var i = 0; i <= ts; i++) {
            var cl = null;
            if (i !== 0) {
                var prop = "{ResultValue_" + (i - 1) + "}";
                cl = new sap.m.Text({
                    text: prop
                });
            } else {
                cl = new sap.m.Text({
                    text: "{Name}"
                });
            }
            columnListItem[columnListItem.length] = cl;
        }

        var oColumnListItemTempl = new sap.m.ColumnListItem({
            cells: columnListItem
        });

        // Create dynamic table 
        labResultsTable.unbindAggregation("items");
        labResultsTable.setModel(that.FinalLabResults);
        labResultsTable.bindAggregation("items", "/FinalLabResults", oColumnListItemTempl);
        var grouper = new sap.ui.model.Sorter("Group", false, function(oContext) {
            return oContext.getProperty("Group");
        });
        labResultsTable.getBinding("items").sort(grouper);

        sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_INDICATOR").setVisible(com.ril.hn.emrpatient.util.Formatter.getDataIndicatorVisibility(that.FinalLabResults.getData().FinalLabResults.length));
        sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_PANEL").setExpanded(false);
    },

    // Right scroll for lab results
    onRightScrollPressed: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/LabResRtScrl", "clicked");

        var tableLR = sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_TABL");
        var columns = tableLR.getColumns();
        for (var i = 1; i < columns.length; i++) {
            if (columns[i].getVisible() == true) {
                columns[i].setVisible(false);
                columns[i + 2].setVisible(true);
                break;
            }
        }
        if (i == columns.length - 3) {
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_RIGHT").setEnabled(false);
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_LEFT").setEnabled(true);
        } else {
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_LEFT").setEnabled(true);
        }
    },


    // Left scroll for lab results
    onLeftScrollPressed: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientDashboard/LabResLftScrl", "clicked");

        var tableLR = sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_TABL");
        var columns = tableLR.getColumns();
        for (var i = columns.length - 1; i > 2; i--) {
            if (columns[i].getVisible() == true) {
                columns[i].setVisible(false);
                columns[i - 2].setVisible(true);
                break;
            }
        }
        if (i == 3) {
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_LEFT").setEnabled(false);
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_RIGHT").setEnabled(true);
        } else {
            sap.ui.getCore().byId("ID_LAB_RESULTS_SCROLL_RIGHT").setEnabled(true);
        }
    },
    //---------------------- End
    
    //---------------------- Images -----------------------------
    onImagesButtonPressed : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/PatImages", "clicked");
		if(that.selectedCaseAndTimeInterval){
			com.ril.hn.emrpatient.util.OrderManager.onOpenImageServerURL(that,sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0],that.selectedCaseAndTimeInterval);
			}else{
			sap.m.MessageToast.show(that.i18n.getText("TXT_VALID_CASE_ERROR"));
		}
		
	},
	//------------------------ End ------------------------------------
	
	//------------------------ Fullscreen Navigations ------------------------------
	
	onFullScreenBtnPress : function(oEvent){
		var sTarget = oEvent.getSource().data("fullScreenType");
		that.selectedCaseAndTimeInterval['SelectedIndex'] = that.selectedCaseAndTimeIntervalIndex ;
		sap.ui.getCore().setModel(new sap.ui.model.json.JSONModel({"SelectedCasesAndTimeIntervalsData":that.selectedCaseAndTimeInterval}),"SelectedCasesAndTimeIntervalsDrModel");
        
		switch(sTarget){
			case "PatientsLabResults" : {
				ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/LabResFullscreen", "clicked");
				if(that.FinalLabResults.getData().FinalLabResults.length > 0){
					sap.ui.getCore().setModel(that.FinalLabResults , "LabResultsDrFullScreenModel");
					sap.ui.getCore().setModel(that.oLabResultMeasurementInfos , "LabResultsDrTimestampsFullScreenModel");
					that.onNavNext(sTarget,"");
				}else{
					com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_NO_LAB_RESULTS_AVAILABLE"), "ERROR", "Alert");
				}
			}
			break;
			case "PatientsClinicalOrder" : {
				ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/COFullscreen", "clicked");
				if(that.oClinicalOrder.getData().ClinicalOrderData.length > 0){
						that.onNavNext(sTarget,"");
					}else{
						com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_NO_CLINICAL_ORDER_AVAILABLE"), "ERROR", "Alert");
					}
			}
			break;
			case "PatientsActiveMedication" :{
				ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/MedFullscreen", "clicked");
				if(that.selectedCaseAndTimeInterval.CaseId !== ""){
					that.onNavNext(sTarget,"");
				}else{
					com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_VALID_CASE_ERROR"), "ERROR", "Alert");
				}
			}
			break;
			case "PatientsAdhocService" :{
				ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/AdhocFullscr", "clicked");
				if(that.oAdhocServices.getData().AdhocServicesData.length > 0){
					 com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "AssignAdhocServices");
					 com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "EditAssignAdhocServices");
					that.onNavNext(sTarget,"");
				}else{
					com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_ADHOC_NOT_AVAILABLE"), "ERROR", "Alert");
				}
			}
			break;
			case "PatientsDocuments" :{
				ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/DocFullscreen", "clicked");
				if(that.oDocuments.getData().DocumentsData.length > 0){
					com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "DocumentsVersionList");
					var filter = sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_FILTER").getSelectedItem().getKey();
					filter = (filter.length>0) ? filter : "All";
					that.onNavNext(sTarget,filter);
				}else{
						com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_NO_DOCUMENTS_AVAILABLE"), "ERROR", "Alert");
					}
			}
			break;
			case "PatientsPhysicianOrder" :{
				ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/POFullscreen", "clicked");
				if(that.oPhysicianOrder.getData().PhysicianOrderData.length > 0){
					com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "CreatePhysicianOrder");
					var filter = sap.ui.getCore().byId("ID_PAT_DASH_PHYSICIAN_ORDER_FILTER").getSelectedItem().getKey();
					filter = (filter.length>0) ? filter : "All";
					that.onNavNext(sTarget,filter);
					}else{
						com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_NO_PHYSICIAN_ORDER_AVAILABLE"), "ERROR", "Alert");
					}
			}
			break;
			case "PatientsProgressNotes" :{
				ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/PNFullscreen", "clicked");
				if(that.oProgressNotes.getData().ProgressNotesData.length > 0){
					com.ril.hn.emrpatient.util.Utility.onDestroyFragment(that, "CreateProgressNote");
					var filter = sap.ui.getCore().byId("ID_PAT_DASH_PROGRESS_NOTE_FILTER").getSelectedItem().getKey();
					filter = (filter.length>0) ? filter : "All";
					that.onNavNext(sTarget,filter);
					}else{
						com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_NO_PROGRESS_NOTES_AVAILABLE"), "ERROR", "Alert");
					}
			}
			break;
			case "PatientsIntakeOutput" :{
				ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/IntakeOutput", "clicked");
				if(that.selectedCaseAndTimeInterval.CaseId !== ""){
					var json = that.selectedCaseAndTimeInterval ;
					json['SelectedIndex'] = that.selectedCaseAndTimeIntervalIndex ;
					var oIndex = new sap.ui.model.json.JSONModel({"SelectedCasesAndTimeIntervalsData" : json  });
					sap.ui.getCore().setModel( oIndex , "SelectedCasesAndTimeIntervalsDrModel");
				}else{
					var json = that.oCasesAndTimeIntervals.getData().CasesAndTimeIntervalsData[0] ;
					json['SelectedIndex'] = 0 ;
					var oIndex = new sap.ui.model.json.JSONModel({"SelectedCasesAndTimeIntervalsData" : json  });
					sap.ui.getCore().setModel( oIndex , "SelectedCasesAndTimeIntervalsDrModel");
				}
				that.onNavNext(sTarget,"");
			}
			break ;
			default : sap.m.MessageToast.show("No such full screen page found.");
						break;
		}
	},
	
	onNavNext : function(sTarget,sFilter){
		if(!sFilter)
			that._oRouter.navTo(sTarget, {entity : "PatientCollection('"+ sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].Id + "')" } , false );
		else
			that._oRouter.navTo(sTarget, {entity : "PatientCollection('"+ sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].Id + "')" , filter : sFilter } , false );
	},
	
	
	_onSOAPNoteButtonPressed : function(){
		ga( "send" , "event" , "ClinicalOVPhysician/PatientDashboard/DiagCre", "clicked");
		if(that.selectedCaseAndTimeInterval.CaseId !== ""){
			var srcPath = com.ril.hn.emrpatient.util.OrderManager.getSOAPNoteURL(sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0],that.selectedCaseAndTimeInterval,that.oWebFacets);
			com.ril.hn.emrpatient.util.Utility.openFioriAppInDialog(that,srcPath,that.getView().getModel("i18n").getResourceBundle().getText("TXT_SOAP_NOTE_TITLE"));
		}else{
				com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_VALID_CASE_ERROR"), "ERROR", "Alert");
			}
	},
	
	//-------------------------- End ---------------------------------
});
// define a root UI component that exposes the main view
jQuery.sap.declare("com.ril.hn.emrpatient.Component");
jQuery.sap.require("sap.ui.core.UIComponent");
jQuery.sap.require("sap.ui.core.routing.History");
jQuery.sap.require("sap.m.routing.RouteMatchedHandler");

/*sap.ui.component.load({
name:"ZHN_API",
url:jQuery.sap.getModulePath("com.ril.hn.emrpatient")+"/../ZHN_API"
});*/


var ga;
sap.ui.core.UIComponent.extend("com.ril.hn.emrpatient.Component", {
    metadata : {
        "name" : "FullScreen",
        "version" : "1.1.0-SNAPSHOT",
        "library" : "com.ril.hn.emrpatient",
        "includes" : [ "../../../../../../sap/bc/ui5_ui5/sap/ZUSAGE/USAGE_CORE.js" , "css/fullScreenStyles.css" ],
        //"includes" : [ "../ZUSAGE/USAGE_CORE.js" , "css/fullScreenStyles.css" ],
        "dependencies" : {
            "libs" : [ "sap.m", "sap.ui.layout" ],
            "components" : []
        },
		"config" : {
			resourceBundle : "i18n/i18n.properties",
			serviceConfig : {
				name: "",
				serviceUrl: ""
			}
		},
        routing : {
            // The default values for routes
            config : {
                "viewType" : "XML",
                "viewPath" : "com.ril.hn.emrpatient.view",
                "targetControl" : "fioriContent", // This is the control in which new views are placed
                "targetAggregation" : "pages", // This is the aggregation in which the new views will be placed
                "clearTarget" : false
            },
			routes : [
				{
					pattern : "",
					name : "PatientOverview",
					view : "PatientOverview"
				},
				{	pattern : "{entity}/{type}",
					name : "PatientDashboard",
					view : "PatientDashboard",
					
				},
				{	pattern : "Dashboard/{entity}/LabResults",
					name : "PatientsLabResults",
					view : "LabResults"
				},
				{	pattern : "Dashboard/{entity}/{filter}/Documents",
					name : "PatientsDocuments",
					view : "Documents"
				},
				{	pattern : "Dashboard/{entity}/{filter}/ProgressNotes",
					name : "PatientsProgressNotes",
					view : "ProgressNotes"
				},
				{	pattern : "Dashboard/{entity}/ScoresCharts",
					name : "PatientsScoresCharts",
					view : "ScoresCharts"
				},
				{	pattern : "Dashboard/{entity}/VitalsCharts",
					name : "PatientsVitalsCharts",
					view : "VitalsCharts"
				},
				{	pattern : "Dashboard/{entity}/MedicationOrder",
					name : "PatientsMedications",
					view : "Medications"
				},
				{	pattern : "Dashboard/{entity}/{filter}/PhysicianOrder",
					name : "PatientsPhysicianOrder",
					view : "PhysicianOrder"
				},
				{	pattern : "Dashboard/{entity}/ClinicalOrder",
					name : "PatientsClinicalOrder",
					view : "ClinicalOrder"
				},
				{	pattern : "Dashboard/{entity}/ServiceOrder",
					name : "PatientsServiceOrder",
					view : "ServiceOrder"
				},
				{	pattern : "Dashboard/{entity}/Medications",
					name : "PatientsActiveMedication",
					view : "ActiveMedication"
				},
				{	pattern : "Dashboard/{entity}/IntakeAndOutput",
					name : "PatientsIntakeOutput",
					view : "IntakeOutput"
				},
				{	pattern : "Dashboard/{entity}/AdhocService",
					name : "PatientsAdhocService",
					view : "AdhocService"
				}
			]
        }
    },

    /**
     * Initialize the application
     * 
     * @returns {sap.ui.core.Control} the content
     */
    createContent : function() {
        var oViewData = {
            component : this
        };

        return sap.ui.view({
            viewName : "com.ril.hn.emrpatient.view.Main",
            type : sap.ui.core.mvc.ViewType.XML,
            viewData : oViewData
        });
    },

    init : function() {
        // call super init (will call function "create content")
        sap.ui.core.UIComponent.prototype.init.apply(this, arguments);

        //analytics initialize
        ga = new ZUSAGE.USAGE_CORE().USAGE_LOG;
        
        // always use absolute paths relative to our own component
        // (relative paths will fail if running in the Fiori Launchpad)
        var sRootPath = jQuery.sap.getModulePath("com.ril.hn.emrpatient");

        // The service URL for the oData model 
        var oServiceConfig = this.getMetadata().getConfig().serviceConfig;
        var sServiceUrl = oServiceConfig.serviceUrl;

        // the metadata is read to get the location of the i18n language files later
        var mConfig = this.getMetadata().getConfig();
        this._routeMatchedHandler = new sap.m.routing.RouteMatchedHandler(this.getRouter(), this._bRouterCloseDialogs);

        // create oData model
        this._initODataModel(sServiceUrl);

        // set i18n model
        var i18nModel = new sap.ui.model.resource.ResourceModel({
            bundleUrl : [ sRootPath, mConfig.resourceBundle ].join("/")
        });
        this.setModel(i18nModel, "i18n");

      //set device model
        var deviceModel = new sap.ui.model.json.JSONModel({
			isPhone : jQuery.device.is.phone,
			isTablet : jQuery.device.is.tablet,
			isDesktop : jQuery.device.is.desktop,
			width : (window.screen.width*0.7) ,
			height : (window.screen.height*0.7) 
		});
		deviceModel.setDefaultBindingMode("OneWay");
		this.setModel(deviceModel, "device");
		
		
		var proxy = "";
        //var proxy = "proxy/http/devnwngd.ril.com:8000";
        var sServiceUrl = proxy + "/sap/opu/odata/MEMR/MOBILE_EMR";
		var m = new sap.ui.model.odata.ODataModel(sServiceUrl, {json: true,loadMetadataAsync: true});
		this.setModel(m , "EMR_SRV");
		
		sServiceUrl = proxy + "/sap/opu/odata/sap/ZISH_DRUG_ADMIN_SRV";
		m = new sap.ui.model.odata.ODataModel(sServiceUrl, {json: true,loadMetadataAsync: true});
		this.setModel(m , "DRUG_ADMIN_SRV");
		
		sServiceUrl = proxy + "/sap/opu/odata/sap/ZISH_PATIENT_SRV";
		m = new sap.ui.model.odata.ODataModel(sServiceUrl, {json: true,loadMetadataAsync: true});
		this.setModel(m , "FAV_SRV");
		
		sServiceUrl = proxy + "/sap/opu/odata/sap/Z_FIORI_PMD_BASE_COMPONENT_SRV";
		m = new sap.ui.model.odata.ODataModel(sServiceUrl, {json: true,loadMetadataAsync: true});
		this.setModel(m , "BASE_COMP_SRV");
		
		sServiceUrl = proxy + "/sap/opu/odata/sap/Z_FIORI_DIS_DEATH_SUMMARY_SRV";
        m = new sap.ui.model.odata.ODataModel(sServiceUrl, {json: true,loadMetadataAsync: true});
		this.setModel(m , "DIS_PROC_SRV");
		
		sServiceUrl = proxy + "/sap/opu/odata/sap/Z_FIORI_DISCHARGE_SRV";
	    m = new sap.ui.model.odata.ODataModel(sServiceUrl, {json: true,loadMetadataAsync: true});
	    this.setModel(m , "DIS_SRV");
	    
	    sServiceUrl = proxy + "/sap/opu/odata/sap/Z_FIORI_VITALSIGNS_SRV";
	    m = new sap.ui.model.odata.ODataModel(sServiceUrl, {json: true,loadMetadataAsync: true});
	    this.setModel(m , "VITALS_SRV");
	    
	    sServiceUrl = proxy + "/sap/opu/odata/sap/ZISH_SCORED_CHARTS_SRV";
	    m = new sap.ui.model.odata.ODataModel(sServiceUrl, {json: true,loadMetadataAsync: true});
	    this.setModel(m , "SCORES_SRV");
	    
	    sServiceUrl = proxy + "/sap/opu/odata/sap/ZMEDEMR_GATEWAY_SRV";
	    m = new sap.ui.model.odata.ODataModel(sServiceUrl, {json: true,loadMetadataAsync: true});
	    this.setModel(m , "GATEWAY_SRV");
	    
	    sServiceUrl = proxy + "/sap/opu/odata/sap/ZEM_DIETARY_SRV/";
	    m = new sap.ui.model.odata.ODataModel(sServiceUrl, {json: true,loadMetadataAsync: true});
	    this.setModel(m , "DIETARY_SRV");
	    
	    sServiceUrl = proxy + "/sap/opu/odata/ISHMOBIL/DISCHARGE_INFO_SRV";
	    m = new sap.ui.model.odata.ODataModel(sServiceUrl, {json: true,loadMetadataAsync: true});
	    this.setModel(m , "MOB_DISCHARGE_SRV");
	    
	    sServiceUrl = proxy + "/sap/opu/odata/sap/Z_INPUT_OUTPUT_SRV/";
	    m = new sap.ui.model.odata.ODataModel(sServiceUrl, {json: true,loadMetadataAsync: true});
	    this.setModel(m , "IP_OP_SRV");
		
        // initialize router and navigate to the first page
        this.getRouter().initialize();

    },

    exit : function() {
        this._routeMatchedHandler.destroy();
    },

    // This method lets the app can decide if a navigation closes all open dialogs
    setRouterSetCloseDialogs : function(bCloseDialogs) {
        this._bRouterCloseDialogs = bCloseDialogs;
        if (this._routeMatchedHandler) {
            this._routeMatchedHandler.setCloseDialogs(bCloseDialogs);
        }
    },

    // creation and setup of the oData model
    _initODataModel : function(sServiceUrl) {
        jQuery.sap.require("com.ril.hn.emrpatient.util.messages");
        var oConfig = {
            metadataUrlParams : {},
            json : true,
            // loadMetadataAsync : true,
            defaultBindingMode :"TwoWay",
            defaultCountMode: "Inline",
            useBatch : true
        };
        var oModel = new sap.ui.model.odata.v2.ODataModel(sServiceUrl, oConfig);
        oModel.attachRequestFailed(null, com.ril.hn.emrpatient.util.messages.showErrorMessage);
        this.setModel(oModel);
    }
});
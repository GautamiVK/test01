jQuery.sap.require("sap.ui.core.mvc.Controller");
jQuery.sap.require("sap.m.TablePersoController");
jQuery.sap.require("com.ril.hn.emrpatient.util.Formatter");
jQuery.sap.require("com.ril.hn.emrpatient.util.Utility");
jQuery.sap.require("com.ril.hn.emrpatient.util.DataManager");
jQuery.sap.require("com.ril.hn.emrpatient.util.SessionManager");
jQuery.sap.require("com.ril.hn.emrpatient.util.Config");

jQuery.sap.require("sap.m.MessageBox");

sap.ui.core.mvc.Controller.extend("com.ril.hn.emrpatient.controller.PatientOverview", {

    bRefreshPatients: true,

    oAppData: {
        appId: "",
        appType: "IP" //IP , OP 
        	
    },

    onInit: function() {
        this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView()));
        this.i18n = this._oComponent.getModel("i18n").getResourceBundle();

        this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        this._oRouter.attachRoutePatternMatched(this._onRoutePatternMatched, this);
        
        this.initReadUrlParams();
    },
    
    initReadUrlParams : function(){
    	var comp = this.getOwnerComponent();
        if (comp.getComponentData() !== undefined && comp.getComponentData().startupParameters !== undefined && comp.getComponentData().startupParameters.appId  !== undefined && comp.getComponentData().startupParameters.appType  !== undefined) {
        	this.oAppData.appType = comp.getComponentData().startupParameters.appType[0];
        	this.oAppData.appId = comp.getComponentData().startupParameters.appId[0];
		}else{
			this.oAppData.appType = "IP";
        	this.oAppData.appId = "";
        	sap.m.MessageToast.show("No parameters found. Loading Inpatients ...");
			//com.ril.hn.emrpatient.util.Utility.displayError("No parameters found. Loading Inpatients ...","WARNING","Note");
		} 
    },

    _onRoutePatternMatched: function(oEvent) {
        if (oEvent.getParameter("name") !== "PatientOverview") {
            return;
        }
        ga("send", "pageview", "ClinicalOVPhysician/PatientMaster");
        
        that = this;
        this._oModel = this.getView().getModel("EMR_SRV");
        
        this.initScreenData();
        
        if (this.patientsTable == undefined)
            this.patientsTable = this.getView().byId("ID_PATIENTS_MASTER_TABL");

        //this.getView().byId("ID_PATIENTS_SERVER").setVisible(false);
    },
    
    initConfigData : function(){
    	this.oConfig = new sap.ui.model.json.JSONModel({"ConfigData": []});
        this.oConfig.getData().ConfigData[0] =  com.ril.hn.emrpatient.util.Config[this.oAppData.appType];
        sap.ui.getCore().setModel(this.oConfig,"ConfigModel");
        this.getView().setModel(this.oConfig,"Config");
        this.getView().bindElement("Config>/ConfigData/0");
        
        //set config to each table separately
        //this.getView().byId("ID_PATIENTS_MASTER_TABL").setModel(this.oConfig,"Config");
    },
    
    initScreenData : function(){
    	if (this.bRefreshPatients){
        	com.ril.hn.emrpatient.util.Utility.onBusyIndicatorOpen(this);
        	this.bRefreshPatients = false;
        	this.initConfigData();
            com.ril.hn.emrpatient.util.SessionManager.initSessionObject(this.oAppData.appType);
            this.getPatientList();
            if(this.oConfig.getData().ConfigData[0].isPOWardSelectionAllowed)
            	this.getFilterList();
        }
    	//com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(this);
    },
    
    //------ Patient List
    getPatientList: function() {
    	if(!this.oPatient)
	        this.oPatient = new sap.ui.model.json.JSONModel({
	            "PatientsData": []
	        });
        var oSession = com.ril.hn.emrpatient.util.SessionManager.getSessionObject(this.oAppData.appType);
        var sPath = "/PatientListCollection(SearchName='" + oSession.searchName + "',SearchParameter='" + oSession.searchParam + "')/Patients";
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, this._oModel, null, null, null, this.onPatientReadSuccess, this.onPatientReadError);
    },

    onPatientReadSuccess: function(oData, oResponse, oRefData) {
        that.oPatient.getData().PatientsData = oData.results;
        that.initPatientList();
        com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(that);
    },

    onPatientReadError: function(oData, oResponse, oRefData) {
        that.oPatient.getData().PatientsData = [];
        that.initPatientList();
        com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(that);
        com.ril.hn.emrpatient.util.Utility.displayError(oData,"ERROR","Alert");
    },

    initPatientList: function() {
        var oPatientTempl = that.getPatientListTemplate();
        that.patientsTable = that.getView().byId("ID_PATIENTS_MASTER_TABL");
        that.patientsTable.setModel(that.oPatient);
        that.oPatient.setSizeLimit(that.oPatient.getData().PatientsData.length);
        that.patientsTable.unbindAggregation("items");
        that.patientsTable.bindAggregation("items", "/PatientsData", oPatientTempl);
        var oSession = com.ril.hn.emrpatient.util.SessionManager.getSessionObject(that.oAppData.appType);
        if (oSession.searchName !== "")
            that.getView().byId("ID_PATIENTS_COUNT").setText(oSession.ward + "(" + that.oPatient.getData().PatientsData.length + ")");
        else
            that.getView().byId("ID_PATIENTS_COUNT").setText("My Patients(" + that.oPatient.getData().PatientsData.length + ")");
        that.getView().byId("ID_PATIENTS_SEARCH").setValue("");
    },

   getPatientListTemplate: function() {
        var oPatientTempl = new sap.m.ColumnListItem({
            cells: [
                new sap.ui.layout.VerticalLayout({
                    content: [new sap.m.ObjectIdentifier({
                            title: "{NameLabel}",
                            text: this.i18n.getText("LBL_PATIENT_AGE") + " : {path: 'Birthdate',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getPatientAge'} ({path: 'Gender',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getPatientGender'})",
                            wrapping: true
                        }),
                        new sap.m.ObjectIdentifier({
                            title: "",
                            text: this.i18n.getText("LBL_PATIENT_ID") + " : {path: 'ExternalPatientId',  formatter: 'com.ril.hn.emrpatient.util.Formatter.trimExtPatientId'} ",
                            wrapping: true
                        })
                    ]
                }),
                new sap.m.Text({
                    text: "{path: 'Birthdate',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDate_DOB_safari'}",
                    wrapping: true
                }),
                new sap.m.Text({
                    text: "{path: 'DateOfAdmission',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDate'}",
                    wrapping: true
                }),
                new sap.m.Text({
                    text: "{ path: 'CurrentLocation' ,  formatter: 'com.ril.hn.emrpatient.util.Formatter.getPatientDepartment'}",
                    wrapping: true
                }),
                new sap.m.Text({
                    text: "{ path: 'WardId' ,  formatter: 'com.ril.hn.emrpatient.util.Formatter.getI18nText'}",
                    wrapping: true
                }),
                new sap.m.Text({
                    text: "{path: 'CurrentLocation',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getPatientBed'}",
                    wrapping: true,
                    visible : (that.oAppData.appType=="IP"?true:false)
                }),
                new sap.ui.core.Icon({
                    src: "{path :'FavoriteColorCode' , formatter:'com.ril.hn.emrpatient.util.Formatter.getFavouriteIconName'}",
                    size: "1.2rem",
                    wrapping: true,
                    color: "{path :'FavoriteColorCode' , formatter:'com.ril.hn.emrpatient.util.Formatter.getFavouriteIconColor'}",
                    press: this.onFavouriteIconPressed,
                    visible : (that.oAppData.appType=="IP"?true:false)
                }),
                new sap.ui.core.Icon({
                    src: "sap-icon://bed",
                    size: "1.2rem",
                    wrapping: true,
                    visible: "{path : 'CurrentLocation' , formatter : 'com.ril.hn.emrpatient.util.Formatter.isLocation'}",
                    press: this.onLocationIconPressed
                }),
                new sap.ui.core.Icon({
                    src: "sap-icon://alert",
                    size: "1.2rem",
                    color: "#ff0000",
                    visible: "{Attention}",
                    wrapping: true
                })

            ],
            type: "Navigation",
            press: this.onListItemPress
        });
        return oPatientTempl;
    },

    onListItemPress: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientMaster/PatientSelect", "clicked");
        var context = oEvent.getSource().getBindingContext();
        var object = context.getObject(context.sPath);
        object.AttendingPhy = "";
        if(!object.DateOfAdmissionActual)
        	object.DateOfAdmissionActual = object.DateOfAdmission;
        object.DateOfAdmission = object.DateOfAdmissionActual;
        if(object.DateOfAdmission){
        	object.DateOfAdmission = com.ril.hn.emrpatient.util.Formatter.getFormattedAdmissionDate(object.DateOfAdmission);
        }
        var patientModel = new sap.ui.model.json.JSONModel({
            "Patient": [object]
        });
        /*patientModel.setDefaultBindingMode("OneWay");;
        patientModel.getData().Patient[0].DateOfAdmission = com.ril.hn.emrpatient.util.Formatter.getFormattedAdmissionDate(patientModel.getData().Patient[0].DateOfAdmission);
        */
        sap.ui.getCore().setModel(patientModel, "PatientHeaderModel");
        
        var entityValue = "PatientCollection('" + object.Id + "')";
        if (object.HideAllDetailData) {
            sap.m.MessageBox.show(that.i18n.getText("TXT_PATIENT_DETAIL_HIDDEN"), {
                icon: sap.m.MessageBox.Icon.WARNING,
                title: "Warning",
                actions: [sap.m.MessageBox.Action.OK]
            });
        } else {
            sap.ui.getCore().setModel(new sap.ui.model.json.JSONModel({
                "Refresh": true
            }), "RefreshScreenModel");
            that._oRouter.navTo("PatientDashboard", {
                entity: entityValue,
                type : that.oAppData.appType
            }, false);
        }
    },


    //------ End

    //------ Filter
    getFilterList: function() {
        if(!this.oFilter)
        	this.oFilter = new sap.ui.model.json.JSONModel({
            "FilterData": []
        	});
        var sPath = "/PatientListCollection";
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, this._oModel, null, null, null, this.onFilterReadSuccess, this.onFilterReadError);
    },

    onFilterReadSuccess: function(oData, oResponse, oRefData) {
        that.oFilter.getData().FilterData = that.getFormattedFilterList(oData.results);
    },

    onFilterReadError: function(oData, oResponse, oRefData) {
        that.oFilter.getData().FilterData = [];
        com.ril.hn.emrpatient.util.Utility.displayError(oData,"ERROR","Alert");
    },

    //------ End

    //------ Filter Open , Close & Select
    onWardFilterOpen: function() {
        ga("send", "event", "ClinicalOVPhysician/PatientMaster/WardFiltrDiag", "clicked");
        this.filterDialog = new sap.m.Dialog({
            title: 'Filter List',
            content: new sap.m.List({
                items: {
                    path: "/FilterData",
                    template: new sap.m.StandardListItem({
                        title: "{parts:[{path:'SubName'}, {path:'SearchName'}] , formatter: 'com.ril.hn.emrpatient.util.Formatter.getFilterSubname'}",
                        press: this.onWardFilterSelected,
                        type: "Active"
                    })
                }
            }),
            beginButton: new sap.m.Button({
                text: 'Close',
                press: function() {
                    that.filterDialog.close();
                }
            }),
            afterClose: function() {
                that.filterDialog.destroy();
            }
        });
        this.filterDialog.setModel(this.oFilter);
        this.filterDialog.open();
    },

    onWardFilterSelected: function(oEvent) {
    	that.filterDialog.close();
        var oSelectedItem = oEvent.getSource();
        if (oSelectedItem) {
            ga("send", "event", "ClinicalOVPhysician/PatientMaster/WardFiltrSel", "clicked");
            com.ril.hn.emrpatient.util.Utility.onBusyIndicatorOpen(that);
            oSelectedItem.setActive(true);
            var context = oSelectedItem.getBindingContext();
            var object = context.getObject(context.sPath);
            var subName = object.SubName;
            var searchName = object.SearchName;
            var searchParam = object.SearchParameter;
            var ward = "";
            if (subName !== "")
                ward = com.ril.hn.emrpatient.util.Formatter.getFormattedWardNames(searchName) + " - " + subName;
            else
                ward = com.ril.hn.emrpatient.util.Formatter.getFormattedWardNames(searchName);
            com.ril.hn.emrpatient.util.SessionManager.setSessionObject(searchName, searchParam, ward);
            that._applyFilter(searchName, searchParam, ward);
        }
    },

    //------End

    _applyFilter: function(searchName, searchParam, ward) {
        ga("send", "event", "ClinicalOVPhysician/PatientMaster/WardFilterSel", "clicked");
        var sPath = "/PatientListCollection(SearchName='" + searchName + "',SearchParameter='" + searchParam + "')/Patients";
        com.ril.hn.emrpatient.util.DataManager.readData(sPath, this._oModel, null, null, null, this.onPatientReadSuccess, this.onPatientReadError);
    },

    onNavBack: function() {
        window.history.go(-1);
    },

    onSortDialogOpen: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientMaster/PatSortDiag", "clicked");
        com.ril.hn.emrpatient.util.Utility.onDialogOpen(this,"viewsetting.PatientOverviewSetting","PatOVSetting");
    },

    handleSortConfirm: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientMaster/PatSortSel", "clicked");
        com.ril.hn.emrpatient.util.Utility.onSortItems(this,"ID_PATIENTS_MASTER_TABL",oEvent);
    },

    handlePatientsSearch: function(oEvent) {
        // Searching patients in master table
        var sValue = oEvent.getSource().getValue();
        var oFilterName = new sap.ui.model.Filter("NameLabel", sap.ui.model.FilterOperator.Contains, sValue);
        var oFilterId = new sap.ui.model.Filter("ExternalPatientId", sap.ui.model.FilterOperator.Contains, sValue);
        var oFilterBed = new sap.ui.model.Filter("CurrentLocation", sap.ui.model.FilterOperator.Contains, sValue);
        var aFilters = [oFilterName, oFilterId, oFilterBed];
        var aOrFilter = [new sap.ui.model.Filter(aFilters, false)];
        com.ril.hn.emrpatient.util.Utility.onFilterItems(this,"ID_PATIENTS_MASTER_TABL", aOrFilter);
     },

    applyGrouperToPatients: function() {
        var grouper = new sap.ui.model.Sorter("Grouping", false, function(oContext) {
            return oContext.getProperty("Grouping");
        });
        this.patientsTable.getBinding("items").sort(grouper);
    },

  
    //------ Location 
    onLocationIconPressed: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientMaster/PatLocatnChck", "clicked");
        com.ril.hn.emrpatient.util.Utility.onDialogCreate(that,"fragment.Location","Location");
        var oButton = oEvent.getSource();
        that.Location.openBy(oButton);

        var locationTree = sap.ui.getCore().byId("ID_LOCATION_TREE");
        locationTree.removeAllNodes();

        var context = oEvent.getSource().getBindingContext();
        var object = context.getObject(context.sPath);
        var l = object.CurrentLocation.split(" ");

        var node = null;
        for (var i = 0; i < l.length; i++) {
            if (node == null) {
                node = new sap.ui.commons.TreeNode({
                    text: com.ril.hn.emrpatient.util.Formatter.getI18nText(l[i]),
                    expanded: true
                });
                locationTree.addNode(node);
            } else {
                var node_new = new sap.ui.commons.TreeNode({
                    text: com.ril.hn.emrpatient.util.Formatter.getI18nText(l[i]),
                    expanded: true
                });
                node.addNode(node_new);
                node = node_new;
            }
        }
    },

    onPopoverClose: function(oEvent) {
        sap.ui.getCore().byId("ID_LOCATION_TREE").removeAllNodes();
        that.Location.close();
    },

    onFavouriteIconPressed: function(oEvent) {
        ga("send", "event", "ClinicalOVPhysician/PatientMaster/PatFavriteOk", "clicked");
        com.ril.hn.emrpatient.util.Utility.onBusyIndicatorOpen(that);
        var context = oEvent.getSource().getBindingContext();
        var object = context.getObject(context.sPath);
        var colorCode = "";
        if (object.FavoriteColorCode !== "")
            colorCode = "";
        else {
            colorCode = "YELLOW";
        }
        var sPath = "UpdateFavoriteColorCode?PatientId='" + object.Id + "'&FavoriteColorCode='" + colorCode + "'";
        var oRefData = {
            object: object,
            colorCode: colorCode
        };
        com.ril.hn.emrpatient.util.DataManager.createData(sPath, that._oModel, null, null, null, oRefData, that.onFavouriteCreateSuccess, that.onFavouriteCreateError);
    },

    onFavouriteCreateSuccess: function(oData, oResponse, oRefData) {
        oRefData.object.FavoriteColorCode = oRefData.colorCode;
        that.oPatient.refresh(true);
        if (oRefData.colorCode !== "")
            sap.m.MessageToast.show(that.i18n.getText("TXT_PATIENT_ADDED_TO_FAVOURITE"));
        else
            sap.m.MessageToast.show(that.i18n.getText("TXT_PATIENT_REMOVED_FROM_FAVOURITE"));
        com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(that);
    },

    onFavouriteCreateError: function(oData, oResponse, oRefData) {
    	com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(that);
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },

    getFormattedFilterList: function(filterList) {
        var filters = [];
        for (var i = 0; i < filterList.length; i++) {
            if (filterList[i].SearchName != "my_appointments") {
                filters[filters.length] = filterList[i];
            }
        }
        that.oFilter = new sap.ui.model.json.JSONModel({
            "FilterData": filters
        });
    },
});
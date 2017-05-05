jQuery.sap.require("sap.ui.core.mvc.Controller");
jQuery.sap.require("com.ril.hn.emrpatient.util.Formatter");

sap.ui.core.mvc.Controller.extend("com.ril.hn.emrpatient.controller.Documents", {
	oDefaultParams: {
        sEntityPath: "",
        sFilterPath: "",
        bAllergyRefreshRequired: true
    },
    
	onInit : function() {
		thatDoc = this ;
		this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView()));
		thatDoc.i18n =  this._oComponent.getModel("i18n").getResourceBundle();

		this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
		this._oRouter.attachRoutePatternMatched(this._onRoutePatternMatched, this);
	},

	_onRoutePatternMatched : function(oEvent) {
		// if not this page then return
		if (oEvent.getParameter("name") !== "PatientsDocuments") {
			return;
		}
		 ga("send", "pageview", "ClinicalOVPhysician/Documents");
		 
		// if this page then initialize the screen
		thatDoc = this ;
		
		var patientHeaderModel = sap.ui.getCore().getModel("PatientHeaderModel");
		
		if(patientHeaderModel == undefined){
			
			thatDoc._oRouter.navTo("PatientOverview", {} , false );
			
		}else{
			
			thatDoc.oModel = this.getView().getModel("EMR_SRV");
			thatDoc.oModelExt = this.getView().getModel("GATEWAY_SRV");;
			thatDoc.oModelScores = this.getView().getModel("SCORES_SRV");
			
			thatDoc.getView().setModel(patientHeaderModel , "PatientHeader");
			thatDoc.getView().bindElement("PatientHeader>/Patient/0");

			thatDoc.oDefaultParams.sEntityPath = "/" + oEvent.getParameters().arguments.entity;
			thatDoc.filterType =  oEvent.getParameters().arguments.filter;
			thatDoc.filterType = (thatDoc.filterType !== "All") ? thatDoc.filterType : "";
			
			thatDoc.casesAndTimeIntervalsModel = sap.ui.getCore().getModel("CasesAndTimeIntervalsDrModel");
			thatDoc.selectedCasesAndTimeIntervalsModel = sap.ui.getCore().getModel("SelectedCasesAndTimeIntervalsDrModel");
			
			if (thatDoc.selectedCasesAndTimeIntervalsModel)
				thatDoc.oDefaultParams.sFilterPath = ("?$filter=TimeInterval eq'" + thatDoc.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Id + "'").replace(" ", "%20");
	        else
	        	thatDoc.oDefaultParams.sFilterPath = "";
			
			thatDoc._initFSDocuments();
			thatDoc.initConfigData();
		}
		
	},
	
	initConfigData: function() {
		thatDoc.getView().setModel(sap.ui.getCore().getModel("ConfigModel"), "Config");
		thatDoc.getView().bindElement("Config>/ConfigData/0");
    },
	
	onNavBack : function(){
		//destroy the fragment on back press since same fragement is used in dashboard screen
		com.ril.hn.emrpatient.util.Utility.onDestroyFragment(thatDoc, "DocumentsVersionList");
        window.history.go(-1);
	},
	
	_initFSDocuments : function(){
		com.ril.hn.emrpatient.util.Utility.onBusyIndicatorOpen(thatDoc);
		//get dall documents according to filter and bind to table
		thatDoc.oFSDocuments = new sap.ui.model.json.JSONModel({"FSDocumentsData" : []  });
		thatDoc.oFSDocTypes = new sap.ui.model.json.JSONModel({"FSDocTypesData" : []  });
		//var sPath = entity + "/Documents" + filter;
		var patient = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
		var caseId = thatDoc.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId;
		var sPath = sModel = "" ;
		//if(caseId){
			sPath = "/DocumentListSet?$filter=Patient eq '"+patient.ExternalPatientId+"' and Case eq '"+caseId+"'";
			sModel = "oModelScores";
			com.ril.hn.emrpatient.util.DataManager.readData(sPath, thatDoc.oModelScores, null, null, null, thatDoc.onFSDocumentsReadSuccess, thatDoc.onFSDocumentsReadError);
			/*}else{
			thatDoc.oFSDocuments.getData().FSDocumentsData = [] ;
			thatDoc.oFSDocTypes.getData().FSDocTypesData = [] ;
			thatDoc._initDocumentsPanel();
		}*/
	},
	
	onFSDocumentsReadSuccess : function(oData, oResponse, oRefData) {
		thatDoc.oFSDocuments.getData().FSDocumentsData = oData.results ;
		thatDoc.oFSDocTypes.getData().FSDocTypesData = thatDoc.getDocTypes(oData.results);
		thatDoc._initDocumentsPanel();
    },

    onFSDocumentsReadError : function(oData, oResponse, oRefData) {
    	thatDoc.oFSDocuments.getData().FSDocumentsData = [] ;
	    thatDoc.oFSDepartments.getData().FSDepartmentsData = []
	    thatDoc._initDocumentsPanel();
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },
	

	_initDocumentsPanel : function() {
		com.ril.hn.emrpatient.util.UiControlManager.initTableControl(thatDoc, thatDoc.getView().byId("ID_PAT_DASH_DOCUMENTS_FS_TABL"), thatDoc.getDocumentsListTemplate(),thatDoc.oFSDocuments, "FSDocumentsData");
	    
		var docTypFilter = thatDoc.getView().byId("ID_PATIENTS_DOCUMENTS_DOCTYPE_FILTER");
		docTypFilter.setModel(thatDoc.oFSDocTypes , "DocTypeFilterModel");
		thatDoc.getView().byId("ID_PATIENTS_DOCUMENTS_DOCTYPE_FILTER").setSelectedKey("");
		thatDoc.getView().byId("ID_PATIENTS_DOCUMENTS_FILTER").setSelectedKey(thatDoc.filterType);
		
		var oFilter  = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, thatDoc.filterType);
		var oFilterGrp = new sap.ui.model.Filter("DocumentGroup", sap.ui.model.FilterOperator.Contains, docTypFilter.getSelectedKey());
		var oBinding = thatDoc.getView().byId("ID_PAT_DASH_DOCUMENTS_FS_TABL").getBinding("items");
        oBinding.filter([oFilter,oFilterGrp]);	
		
		thatDoc.getView().byId("ID_PATIENTS_DOCUMENTS_SEARCH").setValue("");
		thatDoc.getView().byId("ID_PAT_DASH_OBJ_HEADER_DOCUMENTS_TIME_FILTER").setText(thatDoc.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Label);
		com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(thatDoc);
		},
		
		getDocumentsListTemplate : function(){
			var oTempl = new sap.m.ColumnListItem({
				cells : [
				         new sap.m.Link({
				        		 text : "{Title}",
				        		 press : thatDoc.onDocummentLinkPressed,
				        		 emphasized : true,
				        		 wrapping: true
				        	 }),
				        	 new sap.m.Text({
				        		 text :"{path : 'ServiceDepartment' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getI18nText'}",
				        		  wrapping: true
				        	 }),
				        	 new sap.m.ObjectStatus({
				        		 text : "{Status}",
				        		 state : "{path: 'Status', formatter: 'com.ril.hn.emrpatient.util.Formatter.getDocumentsStatus'}",
				        		 wrapping: true
				        	 }),
				        	 new sap.m.Label({
				        		 text : "{path: 'Timestamp',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other'}",
				        		 design : "Bold",
				        		wrapping: true
				        	 }),
				        	 new sap.ui.layout.HorizontalLayout({
								 content : [
				             new sap.ui.core.Icon({
				            	 src : "sap-icon://print" ,
				            	 size : "1.2rem",
				            	 color : "#595959" ,
				            	 tooltip : thatDoc.i18n.getText("TXT_PRINT"),
				            	 press : thatDoc.onDocummentPressed 
				             }).addStyleClass("sapUiTinyMarginEnd"),
				        	 new sap.ui.core.Icon({
					        	 src : "sap-icon://sys-enter" ,
					        	 size : "1.2rem",
					        	 color : "#00a652" ,
					        	 tooltip : thatDoc.i18n.getText("TXT_APPROVAL"),
					        	 visible : "{path: 'Status', formatter: 'com.ril.hn.emrpatient.util.Formatter.getDocumentsApproveVisibility'}",
					        	 press : thatDoc.onDocumentsApprovePressed
					         })
				            ]
				        })
				      ]

			});
	        return oTempl;
		},
		
		onDocummentPressed : function(oEvent){
			ga( "send" , "event" , "ClinicalOVPhysician/Document/DocOpen", "clicked");
			
			var context = oEvent.getSource().getBindingContext();
			var object = context.getObject(context.sPath) ;
			//var src = object.__metadata.media_src ? object.__metadata.media_src : "";
			var host = window.location.host;
			//if(!src){
			var	src = window.location.protocol + "//" + window.location.host +  thatDoc.oModelScores.sServiceUrl + "/DisplayDocumentSet('" +object.Id+ "')/$value";
			//}
			if(host.search("qa")== -1 && host.search("dev")== -1){
				src = src.replace("http://","https://");
			}
			sap.m.URLHelper.redirect(src,true);
		},
		
		
		onCaseAndTimeIntervalsPressed : function(oEvent){
			ga( "send" , "event" , "ClinicalOVPhysician/Document/CseNTymIntDiag", "clicked");
			com.ril.hn.emrpatient.util.CaseAndTimeIntervalManager.onOpenCaseAndTimeIntervalDialog(thatDoc,thatDoc.casesAndTimeIntervalsModel,thatDoc.oDefaultParams.sEntityPath,thatDoc.oModel,thatDoc.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.SelectedIndex,thatDoc.handleCasesAndTimeIntervalsClose);
			
		},
		
		handleCasesAndTimeIntervalsClose : function(oEvent){
			 var oSelectedItem = oEvent.getParameter("selectedItem");
		        if (oSelectedItem) {
		        	ga( "send" , "event" , "ClinicalOVPhysician/Document/CseNTymIntSel", "clicked");
		        	
		        	// get case id and time intervals and refresh the ui
		        	var context = oSelectedItem.getBindingContext() ;
		        	var object = context.getObject(context.sPath) ;
		        	oSelectedItem.setSelected(true);
		        	
		        	thatDoc.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData = object ; 
		        	thatDoc.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData['SelectedIndex'] = context.sPath.split("/")[2];
		        	
		        	thatDoc.oDefaultParams.sFilterPath = ("?$filter=TimeInterval eq'" + object.Id + "'").replace(" ", "%20") ;
		        	
		        	thatDoc._initFSDocuments();
		        	thatDoc.getView().byId("ID_PAT_DASH_OBJ_HEADER_DOCUMENTS_TIME_FILTER").setText(object.Label);
				 }
		},
		
		
		_handleDocumentsSearch : function(oEvent){
			var sValue = oEvent.getSource().getValue() ;
			var aFilters = [] , aOrFilter = [];
	    	var oFilterTitle = new sap.ui.model.Filter("Title", sap.ui.model.FilterOperator.Contains, sValue);
	        var oFilterStat  = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, thatDoc.filterType);
			var oFilterDocTyp  = new sap.ui.model.Filter("DocumentGroup", sap.ui.model.FilterOperator.Contains, thatDoc.getView().byId("ID_PATIENTS_DOCUMENTS_DOCTYPE_FILTER").getSelectedKey());
	        aFilters = [oFilterTitle,oFilterStat,oFilterDocTyp];
	        aOrFilter = [new sap.ui.model.Filter(aFilters,true)];
	        var oBinding = thatDoc.getView().byId("ID_PAT_DASH_DOCUMENTS_FS_TABL").getBinding("items");
	        oBinding.filter(aOrFilter);	
		},
		
		onDocumentsApprovePressed : function(oEvent){
			ga( "send" , "event" , "ClinicalOVPhysician/Document/DocApprove", "clicked");
			var context = oEvent.getSource().getBindingContext();
			var object = context.getObject(context.sPath) ;
			var sPath ="/ReleaseDocumentSet('"+ object.Id +"')";
		      if( object.Status === "In Work"){
				      var data = {Key: ""} ;
				      com.ril.hn.emrpatient.util.DataManager.updateData(sPath, thatDoc.oModelExt, null, null, data, object,function(oData, oResponse, oRefData) {
				          sap.m.MessageToast.show(thatDoc.i18n.getText("TXT_DOCUMENTS_APPROVAL_SUCCESS"));
				          object.Status = "Release";
				          thatDoc.oFSDocuments.refresh(true);
				           }, function(oData, oResponse, oRefData) {
				        	   object.Status = "In Work";
				               com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
				           });
		       }else if(object.Status === "Release"){
		    	   		sap.m.MessageToast.show(thatDoc.i18n.getText("TXT_DOCUMENTS_APPROVAL_RELEASE_STAT"));
		       }
		},

		handleDocumentsFilter : function(oEvent){
			ga( "send" , "event" , "ClinicalOVPhysician/Document/DocStatFilter", "clicked");
			var documentStatus = "" ;
			if(typeof oEvent == "object")
				documentStatus = oEvent.getSource().getSelectedKey();
			else
				documentStatus = oEvent ;
			thatDoc.filterType = documentStatus ;
			var docTyp = oEvent.getSource().getSelectedKey();
			var oFilter = new sap.ui.model.Filter("Title", sap.ui.model.FilterOperator.Contains, thatDoc.getView().byId("ID_PATIENTS_DOCUMENTS_SEARCH").getValue());
			var oFilterStat  = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, thatDoc.filterType);
			var oFilterDocTyp  = new sap.ui.model.Filter("DocumentGroup", sap.ui.model.FilterOperator.Contains, thatDoc.getView().byId("ID_PATIENTS_DOCUMENTS_DOCTYPE_FILTER").getSelectedKey());
			var allFilter = new sap.ui.model.Filter([oFilter,oFilterStat, oFilterDocTyp], true); 
			var oBinding = thatDoc.getView().byId("ID_PAT_DASH_DOCUMENTS_FS_TABL").getBinding("items");
	        oBinding.filter(allFilter);	
		},
		
		handleSettingsDocumentsFSPressed : function(){
			ga( "send" , "event" , "ClinicalOVPhysician/Document/DocSortDiag", "clicked");
			com.ril.hn.emrpatient.util.Utility.onDialogOpen(this,"viewsetting.DocumentsVS","DocumentsVS");
       },
       
       
       _handleDocSettingsConfirm : function(oEvent){
    	   ga( "send" , "event" , "ClinicalOVPhysician/Document/DocSortOk", "clicked");
    	   com.ril.hn.emrpatient.util.Utility.onSortItems(this,"ID_PAT_DASH_DOCUMENTS_FS_TABL",oEvent);
       },
       
       onDocummentLinkPressed : function(oEvent){
			com.ril.hn.emrpatient.util.Utility.onDialogOpen(thatDoc , "fragment.DocumentsVersionList", "DocumentsVersionList");
	        var context = oEvent.getSource().getBindingContext();
	        var object = context.getObject(context.sPath);
	        thatDoc.getDocumentsVersionList(object);
		},
		
		getDocumentVersionTemplate: function() {
	        var oTempl =  new sap.m.ColumnListItem({
				cells : [
				         new sap.m.Text({
				       		 text : "{Title}",
				       		 wrapping: true
				    	 }),
				    	 new sap.m.Text({
				    		 text :"{path : 'Id' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getDocumentDetails'}",
				    		  wrapping: true
				    	 }),
				    	 new sap.m.Text({
				    		 text :"{path : 'ServiceDepartment' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getI18nText'}",
				    		  wrapping: true
				    	 }),
				    	 new sap.m.ObjectStatus({
				    		 text : "{path: 'Status', formatter: 'com.ril.hn.emrpatient.util.Formatter.getDocumentsShortStatus'}",
				    		wrapping: true
				    	 }),
				    	 new sap.m.Label({
				    		 text : "{path: 'Timestamp',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTimeOffest'}",
				    		 design : "Bold",
				    		wrapping: true
				    	 }),
				         new sap.ui.core.Icon({
				        	 src : "sap-icon://print" ,
				        	 size : "1.5rem",
				        	 color : "#595959" ,
				        	 tooltip : thatDoc.i18n.getText("TXT_PRINT"),
				        	 press : thatDoc.onDocummentPressed 
				         })] 

			});
	        return oTempl;
	    },

	    getDocumentsVersionList: function(object) {
	    	thatDoc.oDocVersList = new sap.ui.model.json.JSONModel({
	            "DocumentsVersionListData": []
	        });
	        var sPath = "/ListOfDocumentsWithAllVersionsSet?$filter=ImDocumentid eq '" + object.Id + "'";
	        com.ril.hn.emrpatient.util.DataManager.readData(sPath, thatDoc.oModelScores, null, null, null, function(oData, oResponse, oRefData) {
	        	thatDoc.oDocVersList.getData().DocumentsVersionListData = oData.results;
	        	thatDoc.oDocVersList.refresh(true);
	        	com.ril.hn.emrpatient.util.UiControlManager.initTableControl(thatDoc, sap.ui.getCore().byId("ID_PAT_DASH_DOCUMENTS_VERSION_LIST_TABL"), thatDoc.getDocumentVersionTemplate(), thatDoc.oDocVersList, "DocumentsVersionListData");
	         }, function(oData, oResponse, oRefData) {
	            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
	        });
	    },

		
		getDocTypes: function(results){
			//get unique doc types
			var r = [];
			r.push({"DocumentGroup":""});
			if(results.length >0){
				r.push(results[0]);
				for(var i=1 ; i<results.length;i++){
						var x = true ;
		                for(var j=1 ; j<r.length;j++){
		                	if(r[j]["DocumentGroup"] === results[i]["DocumentGroup"] )
		                		x=false;
		                }
		                if(x)
	                		r.push(results[i]);
		            }
			   return r;
			}else
				return [];
		},
		
		handleDocTypeFilter : function(oEvent){
			ga( "send" , "event" , "ClinicalOVPhysician/Document/DocTypFilter", "clicked");
			//consider both status and department when filtering documents
			var docTyp = oEvent.getSource().getSelectedKey();
			var oFilter = new sap.ui.model.Filter("Title", sap.ui.model.FilterOperator.Contains, thatDoc.getView().byId("ID_PATIENTS_DOCUMENTS_SEARCH").getValue());
			var oFilterStat  = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, thatDoc.filterType);
			var oFilterDocTyp  = new sap.ui.model.Filter("DocumentGroup", sap.ui.model.FilterOperator.Contains, docTyp);
			var allFilter = new sap.ui.model.Filter([oFilter,oFilterStat, oFilterDocTyp], true); 
			var oBinding = thatDoc.getView().byId("ID_PAT_DASH_DOCUMENTS_FS_TABL").getBinding("items");
	        oBinding.filter(allFilter);	
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
jQuery.sap.require("sap.ui.core.mvc.Controller");
jQuery.sap.require("com.ril.hn.emrpatient.util.Formatter");

sap.ui.core.mvc.Controller.extend("com.ril.hn.emrpatient.controller.AdhocService", {

	oDefaultParams: {
        sEntityPath: "",
        sFilterPath: "",
        bAllergyRefreshRequired: true
    },
    
	onInit : function() {
		
		thatAH = this;

		this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView()));
		thatAH.i18n =  this._oComponent.getModel("i18n").getResourceBundle();

		this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
		this._oRouter.attachRoutePatternMatched(this._onRoutePatternMatched, this);
	},

	_onRoutePatternMatched : function(oEvent) {
		// if not this page then return
		if (oEvent.getParameter("name") !== "PatientsAdhocService") {
			return;
		}
		 ga("send", "pageview", "ClinicalOVPhysician/AdhocService");
		 
		// if this page then initialize the screen
		 thatAH = this ;
		var patientHeaderModel = sap.ui.getCore().getModel("PatientHeaderModel");
		
		if(patientHeaderModel == undefined){
			
			thatAH._oRouter.navTo("PatientOverview", {} , false );
			
		}else{
			
			thatAH.oModel = this.getView().getModel("GATEWAY_SRV");
			
			thatAH.getView().setModel(patientHeaderModel , "PatientHeader");
			thatAH.getView().bindElement("PatientHeader>/Patient/0");

			thatAH.casesAndTimeIntervalsModel = sap.ui.getCore().getModel("CasesAndTimeIntervalsDrModel");
			thatAH.selectedCasesAndTimeIntervalsModel = sap.ui.getCore().getModel("SelectedCasesAndTimeIntervalsDrModel");
			
			thatAH.oDefaultParams.sEntityPath =  "/" + oEvent.getParameters().arguments.entity;
			
			thatAH.destroyAllFragments() ;
			thatAH._initFSAdhocService();
		}
		
	},
	
	onNavBack : function(){
		thatAH.destroyAllFragments() ;
		window.history.go(-1);
	},
	
	
	_initFSAdhocService : function(entity,filter){
		com.ril.hn.emrpatient.util.Utility.onBusyIndicatorOpen(thatAH);
		//get clinical order data and initialise the table - consider filter while getting the data
		thatAH.oFSAdhocService = new sap.ui.model.json.JSONModel({"FSAdhocServiceData" : []  });
		var patientData =  sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0] ;
		var sPath = "/AssignServDTOSet?$filter=Institution eq 'RFH1' and  Orgid  eq '" + patientData.ThirdLine + "' and CaseID eq '" + thatAH.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId + "'";
		com.ril.hn.emrpatient.util.DataManager.readData(sPath,thatAH.oModel, null, null, null, thatAH.onFSAdhocServiceReadSuccess, thatAH.onFSAdhocServiceReadError);
	},
	
	onFSAdhocServiceReadSuccess : function(oData, oResponse, oRefData) {
		thatAH.oFSAdhocService.getData().FSAdhocServiceData = oData.results ;
		thatAH._initAdhocServicePanel();
	    },

	    onFSAdhocServiceReadError : function(oData, oResponse, oRefData) {
	    	 thatAH.oFSAdhocService.getData().FSAdhocServiceData = [] ;
			    thatAH._initAdhocServicePanel();
	        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
	    },
	
	

	_initAdhocServicePanel  : function() {
		com.ril.hn.emrpatient.util.UiControlManager.initTableControl(thatAH,thatAH.getView().byId("ID_PAT_DASH_ADHOC_SERVICES_FS_TABL"), thatAH.getFSAdhocServiceTemplate(),thatAH.oFSAdhocService, "FSAdhocServiceData");
	    thatAH.getView().byId("ID_PAT_DASH_OBJ_HEADER_CLINICAL_ORDER_TIME_FILTER").setText(thatAH.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Label);
		thatAH.getView().byId("ID_PAT_DASH_ADHOC_SERV_SEARCH").setValue("");
		com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(thatAH);
	},
	
	getFSAdhocServiceTemplate : function(){
		var oTempl = new sap.m.ColumnListItem({
			cells : [
			         new sap.m.ObjectIdentifier({
			        	 title : "{Service_Desc}", 
			        	 wrapping: true
			         }),
			         new sap.m.ObjectIdentifier({
			        	 title : "{parts : [{path : 'Serv_date'}, {path : 'Serv_time'}] ,  formatter: 'com.ril.hn.emrpatient.util.Formatter.getConcatenatedDateAndTime'}",
			        	 wrapping: true
			         })] 
		});
        return oTempl;
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
			var oBinding = thatAH.getView().byId("ID_PAT_DASH_CLINICAL_ORDER_FS_TABL").getBinding("items");
	        oBinding.filter([oFilter]);	
		} ,
		
		onDialogClose : function(oEvent){
			var sType="";
			if( typeof oEvent == "object"){
				sType = oEvent.getSource().data("dialogType");
			}else if(typeof oEvent  == "string"){
				sType = oEvent;
			}
			this[sType].close();
		},
		
		onAdhocServicesAssignButtonPressed : function(oEvent){
			// if case id is valid then only show the assign dialog
			ga( "send" , "event" , "ClinicalOVPhysician/AdhocService/AdhocAssign", "clicked");
			
			if(thatAH.selectedCasesAndTimeIntervalsModel && thatAH.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId !== ""){
				var patientData =  sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0] ;
				var sPath = "/AdhocDTOSet?$filter=Institution eq 'RFH1' and  Orgid  eq '" + patientData.ThirdLine + "' and CaseID eq '" + thatAH.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId + "'" ;
				com.ril.hn.emrpatient.util.DataManager.readData(sPath, thatAH.oModel, null, null, null, function(oData, oResponse, oRefData) {
					   thatAH.getModifiedAdhocServicesList(oData.results);
					   com.ril.hn.emrpatient.util.Utility.onDialogOpen(thatAH, "fragment.AssignAdhocServices", "AssignAdhocServices");
				       thatAH.initAdhocServicesAssignDialog();
	            }, function(oData, oResponse, oRefData) {
	                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
	            });
		}else{
			sap.m.MessageToast.show(thatAH.i18n.getText("TXT_VALID_CASE_ERROR"));
		}
		},
		
		
		getModifiedAdhocServicesList : function(results){
			thatAH.oAdhocServicesList = new sap.ui.model.json.JSONModel({"AdhocServicesListData" : []   });
			thatAH.oAdhocGroupsList = new sap.ui.model.json.JSONModel({"AdhocGroupsListData" : []   });
			thatAH.oAdhocGroupsList.getData().AdhocGroupsListData[0] = {
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
					thatAH.oAdhocGroupsList.getData().AdhocGroupsListData[thatAH.oAdhocGroupsList.getData().AdhocGroupsListData.length] = obj; 
				}
				if(obj.Serv_is_perform){
					thatAH.oAdhocServicesList.getData().AdhocServicesListData[thatAH.oAdhocServicesList.getData().AdhocServicesListData.length] = obj; 
				}
			}
		},
		
		
		initAdhocServicesAssignDialog : function(){
			if(thatAH.AssignAdhocServices){
				com.ril.hn.emrpatient.util.UiControlManager.initTableControl(thatAH, sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_LIST_TABL"), thatAH.getAssignAdhocServicesTemplate(), thatAH.oAdhocServicesList, "AdhocServicesListData");
			    sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_GRP_LIST").setValue("");
				var selBtn = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SELECTED_COUNT");
				selBtn.setText(thatAH.i18n.getText("TXT_ADHOC_SERVICES_SELECTED_COUNT",[0]));
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
			sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SELECTED_COUNT").setText(thatAH.i18n.getText("TXT_ADHOC_SERVICES_SELECTED_COUNT",[items]));
		},
		
		handleAdhocServicesSelectedPressed : function(){
			ga( "send" , "event" , "ClinicalOVPhysician/AdhocService/AdhocEdit", "clicked");
			var items = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_LIST_TABL").getSelectedContextPaths();
			thatAH.oAdhocSelServicesList = new sap.ui.model.json.JSONModel({"AdhocSelServicesListData" : []});
			$.each(items,function(i,item){
				thatAH.oAdhocSelServicesList.getData().AdhocSelServicesListData[i] = thatAH.oAdhocServicesList.getObject(items[i]);
			});
			if(items.length>0){
				 com.ril.hn.emrpatient.util.Utility.onDialogOpen(thatAH, "fragment.EditAssignAdhocServices", "EditAssignAdhocServices");
				 com.ril.hn.emrpatient.util.UiControlManager.initTableControl(thatAH, sap.ui.getCore().byId("ID_PAT_DASH_SELECTED_ADHOC_SERVICES_LIST_TABL"), thatAH.getEditAssignAdhocServicesTemplate(), thatAH.oAdhocSelServicesList, "AdhocSelServicesListData");
			}else{
				sap.m.MessageToast.show(thatAH.i18n.getText("TXT_NO_SERV_SELECTED"));
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
					        	 change : thatAH.onAdHocServDateTimeChange
					         }),
					         new sap.ui.core.Icon({
					        	 src : "sap-icon://delete" ,
					        	 size : "1.2rem",
					        	 color : "#595959" ,
					        	 press : thatAH.onAdhocServiceDeletePressed 
					         })] ,
					         press : thatAH.onServiceSelectionChange,
					         type : "Active"
					         
				});
		        return oTempl;
		},
		
		onAdHocServDateTimeChange : function(oEvent){
			var evt = oEvent.getSource();
			var admisnDate = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].DateOfAdmission.getTime();
			if((evt.getDateValue().getTime() > new  Date().getTime()) || (evt.getDateValue().getTime() < admisnDate)){
				evt.setValueState("Error");
				evt.setValueStateText(thatAH.i18n.getText("TXT_INVALID_DATE_ADHOC_RELEASE"));
				sap.m.MessageToast.show(thatAH.i18n.getText("TXT_INVALID_DATE_ADHOC_RELEASE"));
			}else{
				evt.setValueState("None");
			}
		},
		
		destroyAllFragments : function(){
			com.ril.hn.emrpatient.util.Utility.onDestroyFragment(thatAH, "EditAssignAdhocServices");
	        com.ril.hn.emrpatient.util.Utility.onDestroyFragment(thatAH, "AssignAdhocServices");
		},
		
		handleAdhocServicesReleasePressed : function(oEvent){
			// release selected services by putting in a batch call
			ga( "send" , "event" , "ClinicalOVPhysician/AdhocService/AdhocRel", "clicked");
			
			if(thatAH.oAdhocSelServicesList.getData().AdhocSelServicesListData.length > 0){
				var patientData =  sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0] ;
				var batchChanges = []; 
				var sPath = "/ReleaseServSet";
				var items = sap.ui.getCore().byId("ID_PAT_DASH_SELECTED_ADHOC_SERVICES_LIST_TABL").getItems();
				var admisnDate = patientData.DateOfAdmission.getTime();
				for(var j=0 ; j<items.length ; j++){
					if((items[j].getCells()[1].getDateValue().getTime() > new Date().getTime()) || (items[j].getCells()[1].getDateValue().getTime() < admisnDate)){
						sap.m.MessageBox.show(thatAH.i18n.getText("TXT_INVALID_DATE_ADHOC_RELEASE"), {
			                title: "Alert",
			                icon: sap.m.MessageBox.Icon.ERROR,
			                actions: [sap.m.MessageBox.Action.OK],
			            });
						return;
					}
				}
				
				//add common to all services properties and remove service description from list 
				for(var i=0 ; i<thatAH.oAdhocSelServicesList.getData().AdhocSelServicesListData.length ; i++){
					var object = thatAH.oAdhocSelServicesList.getData().AdhocSelServicesListData[i] , data = {};
					data.Institution = "RFH1";
					data.Orgid = patientData.WardId ;
					data.PatientID = patientData.ExternalPatientId;
					data.CaseID = thatAH.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId ;
					data.Orgfa = patientData.ThirdLine ;
					data.Leist = object.Service_ID ;
					data.Serv_date = com.ril.hn.emrpatient.util.Formatter.getFormattedDateForAdhoc(items[i].getCells()[1].getDateValue());
					data.Serv_time = com.ril.hn.emrpatient.util.Formatter.getFormattedTimeForAdhoc(items[i].getCells()[1].getDateValue());
					batchChanges.push( thatAH.oModel.createBatchOperation(sPath,"POST", data)); 
				}
				
				thatAH.oModel.addBatchChangeOperations(batchChanges);
				thatAH.oModel.submitBatch(function(oData, oResponse) { 
					var batchError = '' , msg = "";
					for (var i = 0 ; i<oData.__batchResponses.length ; i++){
						if(oData.__batchResponses[i].message !=null && oData.__batchResponses[i].statusCode!="200"){
							batchError='X';
							var m = JSON.parse(oData.__batchResponses[i].response.body);
							m = m.error.message.value;
							msg = msg + "\n" + m ;
						}
					}
					if(batchError=='X'){
						sap.m.MessageBox.show(msg, {
			                title: "Alert",
			                icon: sap.m.MessageBox.Icon.ERROR,
			                actions: [sap.m.MessageBox.Action.OK],
			            });
						return;
					}else{
						sap.m.MessageToast.show(thatAH.i18n.getText("TXT_SERVICES_RELEASE_SUCCESS"));
						thatAH.onDialogClose("EditAssignAdhocServices");
						thatAH.onDialogClose("AssignAdhocServices");
						//refresh the adhoc service panel
						thatAH._initFSAdhocService();
					    /*sPath = "/AssignServDTOSet?$filter=Institution eq 'RFH1' and  Orgid  eq '" + patientData.ThirdLine + "' and CaseID eq '" + thatAH.selectedCaseAndTimeInterval.CaseId + "'" ;
					    thatAH.oModel.read(sPath,null,null,false, function(oData, oResponse){ 
					    	thatAH.oFSAdhocService.getData().FSAdhocServiceData =  oData.results ;
					    	thatAH.oFSAdhocService.refresh(true);
							},function(oData, oResponse){
								var msg = oData.response.body;              
								msg=JSON.parse(msg);
								msg=msg.error.message.value;
								sap.m.MessageBox.show(msg, {
					                title: "Alert",
					                icon: sap.m.MessageBox.Icon.ERROR,
					                actions: [sap.m.MessageBox.Action.OK],
					            });
							});*/
					}
				} , function(oData, oResponse) { 
					var msg = oData.response.body;              
					msg=JSON.parse(msg);
					msg=msg.error.message.value;
					sap.m.MessageBox.show(msg, {
		                title: "Alert",
		                icon: sap.m.MessageBox.Icon.ERROR,
		                actions: [sap.m.MessageBox.Action.OK],
		            });
					
				});
			}else{
				sap.m.MessageToast.show(thatAH.i18n.getText("TXT_NO_SERVICES_TO_RELEASE_ERROR"));
			}
			
		},
		
		handleAdhocServicesByDatePressed : function(oEvent) {
			ga( "send" , "event" , "ClinicalOVPhysician/AdhocService/AdhocByDate", "clicked");
						
			if (!thatAH.AdhocServiceByDate) {
				thatAH.AdhocServiceByDate = sap.ui.xmlfragment("com.ril.hn.emrpatient.fragment.AdhocServiceByDate", thatAH);
				thatAH.getView().addDependent(thatAH.AdhocServiceByDate);
				//thatAH.getFinalLabResultByDate();
	        }
	        
	        var date = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_BY_DATE_DATEPICKER");
	        date.setValue(com.ril.hn.emrpatient.util.Formatter.getFormattedDate(new Date()));
	        date.setDateValue(new Date());
	        
	        thatAH.AdhocServiceByDate.open();
	        
	        var adhocServiceTable = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_BY_DATE_TABL");
	        adhocServiceTable.unbindAggregation("items");
	        adhocServiceTable.setModel(thatAH.oFSAdhocService);
	        adhocServiceTable.bindAggregation("items", "/FSAdhocServiceData", thatAH.getDateWiseTableTemplate());
	        thatAH.onAdhocServiceByDateChange();
	    },
	    
	    getDateWiseTableTemplate: function(oEvent) {
	        var oColumnListItemTempl = new sap.m.ColumnListItem({
	            cells: [ new sap.m.ObjectIdentifier({
		        	 title : "{Service_Desc}", 
		        	 wrapping: true
		         }),
		         new sap.m.ObjectIdentifier({
		        	 title : "{parts : [{path : 'Serv_date'}, {path : 'Serv_time'}] ,  formatter: 'com.ril.hn.emrpatient.util.Formatter.getConcatenatedDateAndTime'}",
		        	 wrapping: true
		         })]
	        });
	        return oColumnListItemTempl;
	    },
	    
	  
	   onAdhocServiceByDateChange: function(oEvent) {
		   ga( "send" , "event" , "ClinicalOVPhysician/AdhocService/AdhocDtChng", "clicked");
			
			   //on date change filter the lab test results
		       var labResultsTable = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_BY_DATE_TABL");
		       var datepicker = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_BY_DATE_DATEPICKER");
		       var tdayDate = new Date();
		       tdayDate.setHours(0);
		       tdayDate.setMinutes(0);
		       tdayDate.setSeconds(0);
		       tdayDate.setMilliseconds(0);
		       
		       var searchDate = datepicker.getDateValue();
		       
		       if (!searchDate) {
		       	return;
		       }
		       
		       searchDate.setHours(0);
		       searchDate.setMinutes(0);
		       searchDate.setSeconds(0);
		       searchDate.setMilliseconds(0);

		       if (searchDate > tdayDate) {
		       	datepicker.setValueStateText(thatAH.getView().getModel("i18n").getResourceBundle().getText("TXT_FUTURE_DATE_ERROR_OTHER"));
		       	datepicker.setValueState("Error");
		           return;
		       }
		       
		       datepicker.setValueStateText("");
		       datepicker.setValueState("None");
		       
		       var oFilter = new sap.ui.model.Filter("Serv_date", sap.ui.model.FilterOperator.Contains, com.ril.hn.emrpatient.util.Formatter.getFormattedDate_YYYY_MM_dd(searchDate));
		       var oBinding = labResultsTable.getBinding("items");
		       oBinding.filter([oFilter]);
		   },
		   
		   onAdhocServicesByDateDialogClose : function(){
			   var date = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_BY_DATE_DATEPICKER");
		       date.setValueStateText("");
		       date.setValueState("None");
		       thatAH.AdhocServiceByDate.close();
		   },
		   
		   onAdhocServiceDeletePressed : function(oEvent){
				var ind = oEvent.getSource().getBindingContext().sPath.split("/")[2];
				thatAH.oAdhocSelServicesList.getData().AdhocSelServicesListData.splice(ind,1);
				thatAH.oAdhocSelServicesList.refresh(true);
			},
			
			handleAdhocServiceSearch : function(oEvent){
				var sValue = oEvent.getSource().getValue() ;
		        var oFilterName = new sap.ui.model.Filter("Service_Desc", sap.ui.model.FilterOperator.Contains, sValue);
		        var oFilterId = new sap.ui.model.Filter("Service_ID", sap.ui.model.FilterOperator.Contains, sValue);
		        var aFilters = [oFilterName,oFilterId];
		        var aOrFilter = [new sap.ui.model.Filter(aFilters,false)];
		        thatAH.getView().byId("ID_PAT_DASH_ADHOC_SERVICES_FS_TABL").getBinding("items").filter(aOrFilter);
			},
			
			onAdhocLeftScrollPressed : function(oEvent){
				var dt = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_BY_DATE_DATEPICKER");
				//var dt = thatAH.getView().byId("VITALS_BY_DATE_DATEPICKER");
		        var t = dt.getDateValue().getTime() -(24 * 60 * 60 * 1000);
		        dt.setDateValue(new Date(t));
		        thatAH.onAdhocServiceByDateChange();
			},
			
			onAdhocRightScrollPressed : function(oEvent){
				var dt = sap.ui.getCore().byId("ID_PAT_DASH_ADHOC_SERVICES_BY_DATE_DATEPICKER");
				//var dt = thatAH.getView().byId("VITALS_BY_DATE_DATEPICKER");
		        var t = dt.getDateValue().getTime() + (24 * 60 * 60 * 1000);
		        dt.setDateValue(new Date(t));
		        thatAH.onAdhocServiceByDateChange();
			}
	
});
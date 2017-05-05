jQuery.sap.require("sap.ui.core.mvc.Controller");
jQuery.sap.require("com.ril.hn.emrpatient.util.Formatter");

sap.ui.core.mvc.Controller.extend("com.ril.hn.emrpatient.controller.ProgressNotes", {
	oDefaultParams: {
        sEntityPath: "",
        sFilterPath: "",
        bAllergyRefreshRequired: true
    },
    
	onInit : function() {
		thatPN = this;

		this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView()));
		thatPN.i18n =  this._oComponent.getModel("i18n").getResourceBundle();

		this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
		this._oRouter.attachRoutePatternMatched(this._onRoutePatternMatched, this);
	},

	_onRoutePatternMatched : function(oEvent) {
		// if not this page then return
		if (oEvent.getParameter("name") !== "PatientsProgressNotes") {
			return;
		}
		 ga("send", "pageview", "ClinicalOVPhysician/ProgressNotes");
		 
		// if this page then initialize the screen
		thatPN = this ;
		var patientHeaderModel = sap.ui.getCore().getModel("PatientHeaderModel");
		
		if(patientHeaderModel == undefined){
			thatPN._oRouter.navTo("PatientOverview", {} , false );
		}else{
			
			thatPN.oModel = this.getView().getModel("EMR_SRV");

			thatPN.getView().setModel(patientHeaderModel , "PatientHeader");
			thatPN.getView().bindElement("PatientHeader>/Patient/0");

			thatPN.oDefaultParams.sEntityPath = "/" + oEvent.getParameters().arguments.entity;
			thatPN.filterType =  oEvent.getParameters().arguments.filter;
			thatPN.filterType = (thatPN.filterType !== "All") ? thatPN.filterType : "";
			
			thatPN.casesAndTimeIntervalsModel = sap.ui.getCore().getModel("CasesAndTimeIntervalsDrModel");
			thatPN.selectedCasesAndTimeIntervalsModel = sap.ui.getCore().getModel("SelectedCasesAndTimeIntervalsDrModel");
			
			if (thatPN.selectedCasesAndTimeIntervalsModel)
				thatPN.oDefaultParams.sFilterPath = ("?$filter=TimeInterval eq'" + thatPN.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Id + "'").replace(" ", "%20");
	        else
	        	thatPN.oDefaultParams.sFilterPath = "";
			
			thatPN._initFSProgressNotes();
		}
		
	},
	
	onNavBack : function(){
		com.ril.hn.emrpatient.util.Utility.onDestroyFragment(thatPN, "CreateProgressNote");
		window.history.go(-1);
	},
	
	
	_initFSProgressNotes : function(entity,filter){
		com.ril.hn.emrpatient.util.Utility.onBusyIndicatorOpen(thatPN);
		thatPN.oFSProgressNotes = new sap.ui.model.json.JSONModel({"FSProgressNotes" : []  });
		var sPath = thatPN.oDefaultParams.sEntityPath + "/ProgressNotes" + thatPN.oDefaultParams.sFilterPath ;
		com.ril.hn.emrpatient.util.DataManager.readData(sPath,thatPN.oModel, null, null, null, thatPN.onFSProgressNotesReadSuccess, thatPN.onFSProgressNotesReadError);
	
	},
	
	onFSProgressNotesReadSuccess : function(oData, oResponse, oRefData) {
		thatPN.oFSProgressNotes.getData().FSProgressNotesData = oData.results ;
		thatPN._initProgressNotesPanel();
	    },

	    onFSProgressNotesReadError : function(oData, oResponse, oRefData) {
	    	 thatPN.oFSProgressNotes.getData().FSProgressNotesData = [] ;
			    thatPN._initProgressNotesPanel();
	        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
	    },
	
	

	_initProgressNotesPanel : function() {
		com.ril.hn.emrpatient.util.UiControlManager.initTableControl(thatPN,thatPN.getView().byId("ID_PAT_DASH_PROGRESS_NOTE_FS_TABL"), thatPN.getFSProgressNotesTemplate(),thatPN.oFSProgressNotes, "FSProgressNotesData");
		thatPN.oFSProgressNotes.refresh();
		thatPN.getView().byId("ID_PAT_DASH_OBJ_HEADER_PROGRESS_NOTES_TIME_FILTER").setText(thatPN.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Label);
		
		thatPN.getView().byId("ID_PAT_DASH_PROGRESS_NOTE_FS_FILTER").setSelectedKey(thatPN.filterType);
		var oFilter  = new sap.ui.model.Filter("CreatorProfession", sap.ui.model.FilterOperator.Contains, thatPN.filterType);
		var oBinding = thatPN.getView().byId("ID_PAT_DASH_PROGRESS_NOTE_FS_TABL").getBinding("items");
        oBinding.filter([oFilter]);	
        
        com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(thatPN);
		},
		
		getFSProgressNotesTemplate : function(){
			var oTempl = new sap.m.FeedListItem({
		       	 enabled : false ,
		       	 value : "{NoteDescription}",
		       	 info : "{Title}",
		       	 showIcon : false,
		       	 senderActive : false ,
		       	 sender : "{CreatorName} ({CreatorProfession})",
					 timestamp : "{ path: 'ObservationTimestamp',  formatter: 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other'}",
					 text : "{NoteDescription}"
		        }).addStyleClass("sapUiSizeCompact");
	        return oTempl;
		},
		
		
		onCaseAndTimeIntervalsPressed : function(oEvent){
			 ga( "send" , "event" , "ClinicalOVPhysician/ProgressNotes/CseNTymIntrvl", "clicked");
			 com.ril.hn.emrpatient.util.CaseAndTimeIntervalManager.onOpenCaseAndTimeIntervalDialog(thatPN,thatPN.casesAndTimeIntervalsModel,thatPN.oDefaultParams.sEntityPath,thatPN.oModel,thatPN.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.SelectedIndex,thatPN.handleCasesAndTimeIntervalsClose);
			
		},
		
		handleCasesAndTimeIntervalsClose : function(oEvent){
			 var oSelectedItem = oEvent.getParameter("selectedItem");
		        if (oSelectedItem) {
		            // get case id and time intervals and refresh the ui
		        	ga( "send" , "event" , "ClinicalOVPhysician/ProgressNotes/CseNTymIntSel", "clicked");
		        	 
		        	var context = oSelectedItem.getBindingContext() ;
		        	var object = context.getObject(context.sPath) ;
		        	oSelectedItem.setSelected(true);
		        	
		        	thatPN.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData = object ; 
		        	thatPN.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData['SelectedIndex'] = context.sPath.split("/")[2];
		        	
		        	thatPN.oDefaultParams.sFilterPath = ("?$filter=TimeInterval eq'" + object.Id + "'").replace(" ", "%20") ;
		        	
		        	thatPN._initFSProgressNotes();
		        	thatPN.getView().byId("ID_PAT_DASH_OBJ_HEADER_PROGRESS_NOTES_TIME_FILTER").setText(object.Label);
					
		        }

		},
		
		
		handleProgressNotesFilter : function(oEvent){
			ga( "send" , "event" , "ClinicalOVPhysician/ProgressNotes/PNProfFiltr", "clicked");
			 
			var creatorProfession = oEvent.getSource().getSelectedKey();
			thatPN.filterType =  creatorProfession ;
			var oFilter ="";
	   		if(creatorProfession == ""){
	   			oFilter  = new sap.ui.model.Filter("CreatorProfession", sap.ui.model.FilterOperator.Contains, "");
			}else {
	   		 	oFilter  = new sap.ui.model.Filter("CreatorProfession", sap.ui.model.FilterOperator.EQ, creatorProfession);
	   		}
			var oBinding = thatPN.getView().byId("ID_PAT_DASH_PROGRESS_NOTE_FS_TABL").getBinding("items");
	        oBinding.filter([oFilter]);	
	       
		} ,
		
		handleCreateProgressNote : function(){
			 ga( "send" , "event" , "ClinicalOVPhysician/ProgressNotes/PNCreDiag", "clicked");
			 com.ril.hn.emrpatient.util.Utility.onDialogOpen(thatPN, "fragment.CreateProgressNote", "CreateProgressNote");
			sap.ui.getCore().byId("ID_PROGRESS_NOTE_CATEGORY").setValue("");
		    sap.ui.getCore().byId("ID_PROGRESS_NOTE_TEXT").setValue("");
		    sap.ui.getCore().byId("ID_PROGRESS_NOTE_DATETIME").setDateValue(new Date());
		},
		
		
		/*On save check all mandatory fields , 
		 * if yes send progress note to backend */
		handleProgressNoteSaveButton : function(){
			var patientid = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0];
	        var progressCategory = sap.ui.getCore().byId("ID_PROGRESS_NOTE_CATEGORY").getValue();
	        var progressNoteObsTime = sap.ui.getCore().byId("ID_PROGRESS_NOTE_DATETIME").getDateValue();
	        
	        if (progressCategory == "") {
	            com.ril.hn.emrpatient.util.Utility.displayError(thatPN.i18n.getText("TXT_CATEGORY_MANDATORY"), "ERROR", "Alert");
	            return false;
	        }
	        var progressNoteText = sap.ui.getCore().byId('ID_PROGRESS_NOTE_TEXT').getValue();
	        if (progressNoteText == "") {
	            com.ril.hn.emrpatient.util.Utility.displayError(thatPN.i18n.getText("TXT_COMMENT_MANDATORY"), "ERROR", "Alert");
	            return false;
	        }
	        if (!progressNoteObsTime) {
	            com.ril.hn.emrpatient.util.Utility.displayError(thatPN.i18n.getText("TXT_DATE_TIME_MANDATORY"), "ERROR", "Alert");
	            return false;
	        } else if (progressNoteObsTime && (progressNoteObsTime.getTime() > new Date().getTime())) {
	            com.ril.hn.emrpatient.util.Utility.displayError(thatPN.i18n.getText("TXT_DATE_TIME_MANDATORY_FUT_DATE"), "ERROR", "Alert");
	            return false;
	        } else if (progressNoteObsTime && patientid.DateOfAdmission) {
	            //observation time should be between past 3 days or admission date whichever is less
	            var admPeriod = Math.abs((patientid.DateOfAdmission.getTime() - new Date().getTime()) / (24 * 3600 * 1000));
	            var obsPeriod = Math.abs((progressNoteObsTime.getTime() - new Date().getTime()) / (24 * 3600 * 1000));
	            if (admPeriod >= 3 && !(obsPeriod <= 3)) {
	                com.ril.hn.emrpatient.util.Utility.displayError(thatPN.i18n.getText("TXT_DATE_TIME_MANDATORY_72HRS"), "ERROR", "Alert");
	                return false;
	            } else if (admPeriod <= 3 && !(admPeriod >= obsPeriod)) {
	                com.ril.hn.emrpatient.util.Utility.displayError(thatPN.i18n.getText("TXT_DATE_TIME_MANDATORY_ADM_DATE"), "ERROR", "Alert");
	                return false;
	            }
	        } else if (progressNoteObsTime && !patientid.DateOfAdmission) {
	            //if admission date is null than check only past 3 days condition
	            var obsPeriod = Math.abs((progressNoteObsTime.getTime() - new Date().getTime()) / (24 * 3600 * 1000));
	            if (!(obsPeriod < 3)) {
	                com.ril.hn.emrpatient.util.Utility.displayError(thatPN.i18n.getText("TXT_DATE_TIME_MANDATORY_72HRS"), "ERROR", "Alert");
	                return false;
	            }
	        }

	        
	        var data  = {
	               NoteDescription : progressNoteText,
	               CreatorRole : "",
	               CategoryId : thatPN.selectedFSPrgsNoteCatLabel,
	               ObservationTimestamp : progressNoteObsTime,
	        };
	       
	        ga( "send" , "event" , "ClinicalOVPhysician/ProgressNotes/PNSave", "clicked");
	       
	        var sPath = thatPN.oDefaultParams.sEntityPath + "/ProgressNotes";
	        com.ril.hn.emrpatient.util.DataManager.createData(sPath, thatPN.oModel, null, null, data, null, function(oData, oResponse, oRefData) {
	            sap.m.MessageToast.show(thatPN.i18n.getText("TXT_PN_SAVED"));
	            sPath = sPath + thatPN.oDefaultParams.sFilterPath;
	            //com.ril.hn.emrpatient.util.DataManager.readData(sPath, thatPN.oModel, null, null, null, thatPN.onProgressNoteReadSuccess, thatPN.onProgressNoteReadError);
	            thatPN._initFSProgressNotes();
	            com.ril.hn.emrpatient.util.Utility.onDialogClose(thatPN, "CreateProgressNote");
	        }, function(oData, oResponse, oRefData) {
	            com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
	        });
		},
		
		
		//Initialise and open progress notes value help dialog
		handleValueHelpProgressNoteCategory : function(oEvent) {
			 ga( "send" , "event" , "ClinicalOVPhysician/ProgressNotes/PNCatDiag", "clicked");
			 
			 var oItem = {
			            Title: "{Name}",
			            Description: "{Id}"
			        };
			        if (thatPN.oFSProgressNoteCat) {
			            if (thatPN.oFSProgressNoteCat.getData().FSProgressNoteCatData.length) {
			                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(thatPN, "vhFSProgressNote", "Category", "/FSProgressNoteCatData", oItem, thatPN.vhFSProgressNotesSearch, thatPN.vhFSProgressNotesClose);
			                vh.setModel(thatPN.oFSProgressNoteCat);
			                vh.open();
			            }
			        } else {
			            thatPN.oFSProgressNoteCat = new sap.ui.model.json.JSONModel({
			                "FSProgressNoteCatData": []
			            });
			            com.ril.hn.emrpatient.util.DataManager.readData("/ProgressNoteCategoryCollection", thatPN.oModel, null, null, null, function(oData, oResponse, oRefData) {
			                thatPN.oFSProgressNoteCat.getData().FSProgressNoteCatData = oData.results;
			                var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(thatPN, "vhFSProgressNote", "Category", "/FSProgressNoteCatData", oItem, thatPN.vhFSProgressNotesSearch, thatPN.vhFSProgressNotesClose);
			                vh.setModel(thatPN.oFSProgressNoteCat);
			                vh.open();
			            }, function(oData, oResponse, oRefData) {
			                com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
			            });
			        }
		},
		
		
		//close progress notes value help dialog and show selected category
		vhFSProgressNotesClose : function(oEvent) {
		        var oSelectedItem = oEvent.getParameter("selectedItem");
		        if (oSelectedItem) {
		        	 ga( "send" , "event" , "ClinicalOVPhysician/ProgressNotes/PNCatSel", "clicked");
		            var progressNoteCatTitle = oSelectedItem.getTitle();
		            thatPN.selectedFSPrgsNoteCatLabel = oSelectedItem.getDescription();
		            var progressNoteCategory = sap.ui.getCore().byId("ID_PROGRESS_NOTE_CATEGORY");
		            progressNoteCategory.setValue(progressNoteCatTitle);
		        }

		},
		
		vhFSPhysicianOrderCatSearch  : function(evt) {
		       var sValue = evt.getParameter("value");
		       var oNameFilter = new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sValue);
		       evt.getSource().getBinding("items").filter([oNameFilter]);	
		},

		
		
		handleSettingsProgressNoteFSPressed : function(){
			 ga( "send" , "event" , "ClinicalOVPhysician/ProgressNotes/PNSortDiag", "clicked");
			 com.ril.hn.emrpatient.util.Utility.onDialogOpen(this,"viewsetting.ProgressNotesVS","ProgressNotesVS");
	       },
	       
	       
	       handlePNSettingsConfirm : function(oEvent){
	    	   ga( "send" , "event" , "ClinicalOVPhysician/ProgressNotes/PNSortOk", "clicked");
	    	  com.ril.hn.emrpatient.util.Utility.onSortItems(this,"ID_PAT_DASH_PROGRESS_NOTE_FS_TABL",oEvent);
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
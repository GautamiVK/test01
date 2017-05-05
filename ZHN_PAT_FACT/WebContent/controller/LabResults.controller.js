jQuery.sap.require("sap.ui.core.mvc.Controller");
jQuery.sap.require("com.ril.hn.emrpatient.util.Formatter");

sap.ui.core.mvc.Controller.extend("com.ril.hn.emrpatient.controller.LabResults", {
	 oDefaultParams: {
	        sEntityPath: "",
	        sFilterPath: "",
	        bAllergyRefreshRequired: true
	    },
	    
	onInit: function() {
		//ga('send', 'emrpatient');
		//ga('send', 'pageview','/emrpatientDoctor/LabResults_View');
		
		thatLR = this;

		this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView()));
		thatLR.i18n =  this._oComponent.getModel("i18n").getResourceBundle();

		this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
		this._oRouter.attachRoutePatternMatched(this._onRoutePatternMatched, this);
	},

	
	_onRoutePatternMatched : function(oEvent) {
		// if not this page then return
		if (oEvent.getParameter("name") !== "PatientsLabResults") {
			return;
		}

		 ga("send", "pageview", "ClinicalOVPhysician/LabResults");
		 
		// if this page then initialize the screen
		thatLR = this ;
		
		var labResultsModel = sap.ui.getCore().getModel("LabResultsDrFullScreenModel");
		var labResultsTimestampsModel = sap.ui.getCore().getModel("LabResultsDrTimestampsFullScreenModel");
		
		if(labResultsModel == undefined && labResultsTimestampsModel == undefined){
			
			thatLR._oRouter.navTo("PatientOverview", {} , false );
			
		}else{
			
			thatLR.oModel = this.getView().getModel("EMR_SRV");
			
			var patientHeaderModel = sap.ui.getCore().getModel("PatientHeaderModel");
			thatLR.getView().setModel(patientHeaderModel , "PatientHeader");
			thatLR.getView().bindElement("PatientHeader>/Patient/0");

			thatLR.oDefaultParams.sEntityPath = "/" + oEvent.getParameters().arguments.entity;
			
			thatLR.casesAndTimeIntervalsModel = sap.ui.getCore().getModel("CasesAndTimeIntervalsDrModel");
			thatLR.selectedCasesAndTimeIntervalsModel = sap.ui.getCore().getModel("SelectedCasesAndTimeIntervalsDrModel");
			
			if (thatLR.selectedCasesAndTimeIntervalsModel)
				thatLR.oDefaultParams.sFilterPath = ("?$filter=TimeInterval eq'" + thatLR.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Id + "'").replace(" ", "%20");
	        else
	        	thatLR.oDefaultParams.sFilterPath = "";
			
			thatLR.getView().byId("ID_PAT_DASH_OBJ_HEADER_LAB_RESULTS_TIME_FILTER").setText(thatLR.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Label);
			
			thatLR._initLabResults();
			thatLR.getUniqueLabResultGroups();
			thatLR.initConfigData();
		}
		
	},
	
	initConfigData: function() {
		thatLR.getView().setModel(sap.ui.getCore().getModel("ConfigModel"), "Config");
		thatLR.getView().bindElement("Config>/ConfigData/0");
    },
	
	_initLabResults : function (labResults , timestamps){
		com.ril.hn.emrpatient.util.Utility.onBusyIndicatorOpen(thatLR);
		var labResults = sap.ui.getCore().getModel("LabResultsDrFullScreenModel");
		var timestamps = sap.ui.getCore().getModel("LabResultsDrTimestampsFullScreenModel").getData().LabResultMeasurementInfosData;
		
		// Dynamically creting table 
		var labResultsTable = thatLR.getView().byId("ID_PAT_DASH_LAB_RESULTS_FS_TABL");
		labResultsTable.removeAllColumns();
		labResultsTable.removeAllItems();
		labResultsTable.destroyItems();

		var columnListItem = [] ;
		var ts = timestamps.length ;

		// Set visibility for scroll buttons
		//if(ts <= 4){
		if(ts <= 3){
			thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_LEFT").setVisible(false);
			thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_RIGHT").setVisible(false);
		}else{
			thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_LEFT").setVisible(true);
			thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_LEFT").setEnabled(false);
			thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_RIGHT").setVisible(true);
			thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_RIGHT").setEnabled(true);
		}

		// Create columns headers template
		//for(var i=0 ; i <= ts ;  i++){
		for(var i=0 ; i < ts+2 ;  i++){
			var c = "" ;
			//if(i !== 0){
			if(i > 1){
				var d = com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other(timestamps[i-2].Timestamp) ; //+ " -"+i ;
				//var visible = (i >= 1 && i<= 4) ? true : false ; // 4 time columns will be shown
				var visible = (i >= 1 && i<= 4) ? true : false ; // 4 time columns will be shown
				c = new sap.m.Column({
					hAlign:"Center",
					visible : visible ,
					header : new sap.m.Text({
						text : d ,
						wrapping: true
					})
				});
			}else if(i==0){
				c = new sap.m.Column({
					hAlign:"Left",
					mergeDuplicates: true,
					header : new sap.m.Text({
						text : "Group",
						wrapping: true
					})
				});
			}
			else if(i==1){
				c = new sap.m.Column({
					hAlign:"Left",
					header : new sap.m.Text({
						text : "Test",
						wrapping: true
					})
				});
			}
			labResultsTable.addColumn(c); 
		}

		// Create column list items template
		for(var i=0 ; i < ts+2 ;  i++){
			var cl = null ;
			//if(i !== 0){
			if(i > 1){
				var prop =  "{ResultValue_" + (i-2) + "}" ;
				var prop =  "{ResultValue_" + (i-2) + "}" ;
				cl = new sap.m.Text({
					text : prop
				});
			}else if(i==0){
				cl = new sap.m.Text({
					text : "{Group}" ,
					wrapping: true
				});
			}
			else if(i==1){
				cl = new sap.m.Link({
					text : "{Name}" ,
					enabled : true ,
					press : thatLR.onLabTestPressed ,
					wrapping: true
				});
			}
			columnListItem[columnListItem.length] = cl ;
		}

		var oColumnListItemTempl = new sap.m.ColumnListItem({
			cells : columnListItem
		});

		// Create dynamic table 
		labResultsTable.unbindAggregation("items");
		labResultsTable.setModel(labResults);
		labResultsTable.bindAggregation("items","/FinalLabResults", oColumnListItemTempl );
		var grouper = new sap.ui.model.Sorter("Group", false , function(oContext) {
			return oContext.getProperty("Group");
		});
		//labResultsTable.getBinding("items").sort(grouper);
		com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(thatLR);
	},
	
	onLabTestPressed : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/LabResults/LabTstDetlDiag", "clicked");
		com.ril.hn.emrpatient.util.Utility.onDialogOpen(thatLR, "fragment.LabResultsByTest", "LabResultsByTest");
		var context = oEvent.getSource().getBindingContext();
		var object = context.getObject(context.sPath) ;
		sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_BY_TEST_DIALOG").setTitle(object.Name);
		
		thatLR._initLabResultsByTestTable(object);
		
	},
	
	onDialogClose : function(oEvent){
		var sType = oEvent.getSource().data("dialogType");
		this[sType].close();
	},
	
	_initLabResultsByTestTable : function(object){
		var ts = sap.ui.getCore().getModel("LabResultsDrTimestampsFullScreenModel").getData().LabResultMeasurementInfosData.length ;
		var labResultsByTestTable = sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_BY_TEST_TABL");
		labResultsByTestTable.removeAllItems() ;
		labResultsByTestTable.destroyItems();
		
        var time = ""  , value = "" ;
		for(var i = 0 ; i < ts ;  i++){
			time = "TimeStamp_" + i ;
			value = "ResultValue_" + i  ;
			if(object[value]!=""){
			var columnListItem = new sap.m.ColumnListItem({
	            cells : [new sap.m.Text({
					text : com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other(object[time]),
					wrapping : true 
				}),
				new sap.m.Text({
					text : object[value],
					wrapping : true 
				})
	            ]
			});
			labResultsByTestTable.addItem(columnListItem) ;
		 }
		}

	},

	onRightScrollPressed : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/LabResults/LabTestRtScrl", "clicked");
		
		// Right scroll for lab results
		var  tableLR = thatLR.getView().byId("ID_PAT_DASH_LAB_RESULTS_FS_TABL");
		var columns = tableLR.getColumns();
		for(var i = 2; i<columns.length;i++){ // i starts from columns to be hide/shown , frst 2 columns are always visible
			if(columns[i].getVisible()==true){
				columns[i].setVisible(false);
				//columns[i+4].setVisible(true);  // +4 since 4 timestamps visible at a tym
				columns[i+3].setVisible(true);  // +4 since 4 timestamps visible at a tym  //+3 since 3 time columns to be shown
				break;
			}  // 
		}
		//if(i==columns.length-5){            // hide right scroll button when reached end , visible 5 columns
		if(i==columns.length-4){   //
			thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_RIGHT").setEnabled(false);
			thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_LEFT").setEnabled(true);
		}else{
			thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_LEFT").setEnabled(true);
		}
	},

	onLeftScrollPressed : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/LabResults/LabTstLftScrl", "clicked");
		
		// Left scroll for lab results
		var  tableLR = thatLR.getView().byId("ID_PAT_DASH_LAB_RESULTS_FS_TABL");
		var columns = tableLR.getColumns();
		//for(var i = columns.length-1; i>4;i--){
		for(var i = columns.length-1; i>=2;i--){
			if(columns[i].getVisible()==true){
				columns[i].setVisible(false);
				//columns[i-4].setVisible(true);   // -4 since 4 timestamps visible at a tym
				columns[i-3].setVisible(true);
				break;
			}
		}
		//if(i==5){                                // hide left scroll button when reached end , visible 5 columns
		if(i==5){
			thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_LEFT").setEnabled(false);
			thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_RIGHT").setEnabled(true);
		}else{
			thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_RIGHT").setEnabled(true);
		}
	},
	
	onNavBack : function() {
		window.history.go(-1);
		thatLR.getView().byId("ID_PATIENTS_LAB_RESULTS_TEST_SEARCH").setValue("");
		com.ril.hn.emrpatient.util.Utility.onDestroyFragment(thatLR, "LabResultsByDate");
	} ,

	onPopoverClose : function(oEvent){
		thatLR.LabResultsByTest.close();
	},
	
	_handleLabResultsTestSearch : function(oEvent){
		var sValue = oEvent.getSource().getValue() ;
		var oFilter1 = new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sValue);
		var oFilter2 = new sap.ui.model.Filter("Group", sap.ui.model.FilterOperator.Contains, sValue);
		var allFilter = new sap.ui.model.Filter([oFilter1, oFilter2], false); 
		var oBinding = thatLR.getView().byId("ID_PAT_DASH_LAB_RESULTS_FS_TABL").getBinding("items");
		oBinding.filter(allFilter);	
	},
	
	 onCaseAndTimeIntervalsPressed : function(oEvent){
		 ga( "send" , "event" , "ClinicalOVPhysician/LabResults/CseNTymIntDiag", "clicked");
		 com.ril.hn.emrpatient.util.CaseAndTimeIntervalManager.onOpenCaseAndTimeIntervalDialog(thatLR,thatLR.oCasesAndTimeIntervals,thatLR.oDefaultParams.sEntityPath,thatLR.oModel,thatLR.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.SelectedIndex,thatLR.handleCasesAndTimeIntervalsClose);
		},
		
		handleCasesAndTimeIntervalsClose : function(oEvent){
			 var oSelectedItem = oEvent.getParameter("selectedItem");
		        if (oSelectedItem) {
		        	ga( "send" , "event" , "ClinicalOVPhysician/LabResults/CseNTymIntSel", "clicked");
		        	
		        	// get case id and time intervals and refresh the ui
		        	var context = oSelectedItem.getBindingContext() ;
		        	var object = context.getObject(context.sPath) ;
		        	oSelectedItem.setSelected(true);
		        	
		        	thatLR.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData = object ; 
		        	thatLR.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData['SelectedIndex'] = context.sPath.split("/")[2];
		        	
		        	thatLR.oDefaultParams.sFilterPath = ("?$filter=TimeInterval eq'" + object.Id + "'").replace(" ", "%20") ;
		        	
		        	thatLR.createLabResultJSON();
		        	
		        	thatLR.getView().byId("ID_PAT_DASH_OBJ_HEADER_LAB_RESULTS_TIME_FILTER").setText(object.Label);
					
		        }

		},
		
		handleCasesAndTimeIntervalsSearch : function(oEvent) {
		       var sValue = oEvent.getParameter("value");
		       var oTitleFilter = new sap.ui.model.Filter("Label", sap.ui.model.FilterOperator.Contains, sValue);
		       oEvent.getSource().getBinding("items").filter([oTitleFilter]);	
		},

	onLabResultsByGroupPressed : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/LabResults/LabResByGrpDiag", "clicked");
		com.ril.hn.emrpatient.util.Utility.onDialogOpen(thatLR, "fragment.LabResultsByGroup", "LabResultsByGroup");

		var groupSelect = sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_BY_GROUP_FILTER");
		groupSelect.setModel(thatLR.oLabResultUniqueGroups,"LabResultsByGroupFilterModel");
		
		var group = thatLR.oLabResultUniqueGroups.getData().LabResultUniqueGroupsData[0].Group ;
		if(group !== "No Groups available"){
			thatLR.onLabResultGroupChange(thatLR.oLabResultUniqueGroups.getData().LabResultUniqueGroupsData[0].Group);
		}else{
			var labResultsTable =  sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_BY_GROUP_TABL");
			labResultsTable.removeAllColumns();
			labResultsTable.removeAllItems();
			labResultsTable.destroyItems();
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_LEFT").setVisible(false);
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_RIGHT").setVisible(false);
		}
		groupSelect.setSelectedKey(thatLR.oLabResultUniqueGroups.getData().LabResultUniqueGroupsData[0].Group);
	},
	
	getUniqueLabResultGroups : function(){
		var labResultsModel = sap.ui.getCore().getModel("LabResultsDrFullScreenModel");
		var arr = [] ;
		if(labResultsModel.getData().FinalLabResults.length > 0){
			arr.push(labResultsModel.getData().FinalLabResults[0]);
			for(var i=1 ; i<labResultsModel.getData().FinalLabResults.length ; i++){
				var obj = labResultsModel.getData().FinalLabResults[i];
				var containsGroup = "";
				for(var j=0 ; j<arr.length ; j++){
					if(obj.Group == arr[j].Group){
						containsGroup = "X";
						break;
					}
				}
				if(containsGroup !== "X")
					arr.push(obj);
				
			}
		}else{
			var json = {"Group" : "No Groups available"};
			arr.push(json);
		}
		thatLR.oLabResultUniqueGroups = new sap.ui.model.json.JSONModel({"LabResultUniqueGroupsData" :  arr }); 
	},
	
	onLabResultGroupChange : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/LabResults/LabResbyGrpChng", "clicked");
		
		/// not checked because of test data
		var selectedGroup = "" ;
		if(typeof oEvent == "object")
			selectedGroup = oEvent.getSource().getSelectedKey();
		else
			selectedGroup = oEvent ;
		thatLR.labResultTestByGroup = thatLR.getLabResultTestsBySelectedGroup(selectedGroup);
		thatLR.labResultUniqueTimestamps = thatLR.getLabResultTimestampsBySelectedGroup();
		var finalLabResultByGroup = thatLR.getFinalLabResultByGroup();
		thatLR.oFinalLabResultByGroupModel = new sap.ui.model.json.JSONModel({"FinalLabResultByGroupData" :  finalLabResultByGroup }); 
		thatLR._initLabResultsByGroup(thatLR.oFinalLabResultByGroupModel , thatLR.labResultUniqueTimestamps);
	},
	
	getLabResultTestsBySelectedGroup : function(value){
		var labResultsModel = sap.ui.getCore().getModel("LabResultsDrFullScreenModel");
		var arr = [];
		for(var i=0 ; i< labResultsModel.getData().FinalLabResults.length ; i++){
			var obj = labResultsModel.getData().FinalLabResults[i];
				if(obj.Group === value)
					arr.push(obj);
			}
		return arr;
	},
	
	getLabResultTimestampsBySelectedGroup : function(){
		var labResultsTimestampsModel = sap.ui.getCore().getModel("LabResultsDrTimestampsFullScreenModel");
		var arr = [];
		for(var i=0 ; i< labResultsTimestampsModel.getData().LabResultMeasurementInfosData.length ; i++){
			for(var j=0 ; j<thatLR.labResultTestByGroup.length ; j++){
				var obj = thatLR.labResultTestByGroup[j];
				if(obj[ 'ResultValue_' + i  ] !== ""){
					arr.push(labResultsTimestampsModel.getData().LabResultMeasurementInfosData[i]);
					arr[arr.length-1]['PropertyIndex'] = i ;
					break;
				}
			}
		}
		return arr;
	},
	
	getFinalLabResultByGroup : function(){
		var arr = [];
		var json = {};
		for(var i=0 ; i<thatLR.labResultUniqueTimestamps.length ; i++){
			json = {};
			json['Timestamp'] = thatLR.labResultUniqueTimestamps[i].Timestamp;
			var index = thatLR.labResultUniqueTimestamps[i].PropertyIndex ;
			for(var j=0 ; j<thatLR.labResultTestByGroup.length ; j++){
				json[ 'Id_' + j ] = thatLR.labResultTestByGroup[j].Id ;
				json[ 'TestName_' + j ] = thatLR.labResultTestByGroup[j].Name ;
				json[ 'NormalRange_' + j ] = thatLR.labResultTestByGroup[j][ 'NormalRange_' + index ] ;
				json[ 'Abnormal_' + j ] = thatLR.labResultTestByGroup[j]['Abnormal_' + index] ;
				json[ 'ResultValue_' + j ] = thatLR.labResultTestByGroup[j]['ResultValue_' + index] ;
				json[ 'ResultComment_' + j ] = thatLR.labResultTestByGroup[j]['ResultComment_' + index ] ;
			}
			arr.push(json);
		}
		return arr;
	},
	
	_initLabResultsByGroup : function (labResults , timestamps){
		// Dynamically creting table with 3 test columns
		var labResultsTable =  sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_BY_GROUP_TABL");
		labResultsTable.removeAllColumns();
		labResultsTable.removeAllItems();
		labResultsTable.destroyItems();

		var columnListItem = [] ;
		var ts = thatLR.labResultTestByGroup.length ;

		// Set visibility for scroll buttons
		if(ts <= 3){
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_LEFT").setVisible(false);
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_RIGHT").setVisible(false);
		}else{
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_LEFT").setVisible(true);
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_LEFT").setEnabled(false);
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_RIGHT").setVisible(true);
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_RIGHT").setEnabled(true);
		}

		// Create columns headers template
		for(var i=0 ; i <= ts ;  i++){
			var c = "" ;
			if(i !== 0){
				var d = thatLR.labResultTestByGroup[i-1].Name;
				var visible = (i >= 1 && i<= 3) ? true : false ; // 4 time columns will be shown
				c = new sap.m.Column({
					hAlign:"Center",
					visible : visible ,
					header : new sap.m.Text({
						text : d ,
						wrapping: true
					})
				});
			}else{
				c = new sap.m.Column({
					hAlign:"Left",
					header : new sap.m.Text({
						text : "Test",
						wrapping: true
					})
				});
			}
			labResultsTable.addColumn(c); 
		}

		// Create column list items template
		for(var i=0 ; i <= ts ;  i++){
			var cl = null ;
			if(i !== 0){
				var prop =  "{ResultValue_" + (i-1) + "}" ;
				cl = new sap.m.Text({
					text : prop
				});
			}else{
				var prop = "{path : 'Timestamp' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTime_Other'}";
				cl = new sap.m.Text({
					text : prop ,
					wrapping: true
				});
			}
			columnListItem[columnListItem.length] = cl ;
		}

		var oColumnListItemTempl = new sap.m.ColumnListItem({
			cells : columnListItem
		});

		// Create dynamic table 
		labResultsTable.unbindAggregation("items");
		labResultsTable.setModel(labResults);
		labResultsTable.bindAggregation("items","/FinalLabResultByGroupData", oColumnListItemTempl );

	},
	
	onGroupRightScrollPressed : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/LabResults/LRBGrpRtScrl", "clicked");
		
		// Right scroll for lab results
		var  tableLR = sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_BY_GROUP_TABL");
		var columns = tableLR.getColumns();
		for(var i = 1; i<columns.length;i++){
			if(columns[i].getVisible()==true){
				columns[i].setVisible(false);
				columns[i+3].setVisible(true);
				break;
			}
		}
		if(i==columns.length-4){
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_RIGHT").setEnabled(false);
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_LEFT").setEnabled(true);
		}else{
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_LEFT").setEnabled(true);
		}
	},

	onGroupLeftScrollPressed : function(oEvent){
		ga( "send" , "event" , "ClinicalOVPhysician/LabResults/LRBGrpLftScrl", "clicked");
		
		// Left scroll for lab results
		var  tableLR = sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_BY_GROUP_TABL");
		var columns = tableLR.getColumns();
		for(var i = columns.length-1; i>3;i--){
			if(columns[i].getVisible()==true){
				columns[i].setVisible(false);
				columns[i-3].setVisible(true);
				break;
			}
		}
		if(i==4){
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_LEFT").setEnabled(false);
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_RIGHT").setEnabled(true);
		}else{
			sap.ui.getCore().byId("ID_LAB_RESULTS_BY_GROUP_FS_SCROLL_RIGHT").setEnabled(true);
		}
	},
	
	//Lab results by date 
	onLabResultsByDatePressed : function(oEvent) {
		ga( "send" , "event" , "ClinicalOVPhysician/LabResults/LabResByDtDiag", "clicked");
		
		if (!thatLR.LabResultsByDate) {
            thatLR.LabResultsByDate = sap.ui.xmlfragment("com.ril.hn.emrpatient.fragment.LabResultByDate", thatLR);
            thatLR.getView().addDependent(thatLR.LabResultsByDate);

            thatLR.isByDateFragmentInitial = true;
            thatLR.getFinalLabResultByDate();
        }
        
        var date = sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_BY_DATE_DATEPICKER");
        date.setValue(com.ril.hn.emrpatient.util.Formatter.getFormattedDate(new Date()));
        date.setDateValue(new Date());
        
        thatLR.LabResultsByDate.open();
        
        var labResultsTable = sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_BY_DATE_TABL");
        
        if (thatLR.isByDateFragmentInitial) {
        	labResultsTable.unbindAggregation("items");
            labResultsTable.setModel(thatLR.oFinalLabResultByDateModel);
            thatLR.isByDateFragmentInitial = false;
            
            labResultsTable.bindAggregation("items", "/FinalLabResultByDateData", thatLR.getDateWiseTableTemplate());
            var grouper = new sap.ui.model.Sorter("Group", false, function(oContext) {
                return oContext.getProperty("Group");
            });
            //labResultsTable.getBinding("items").sort(grouper);
        }
        
        if (thatLR.isByDateFragmentTimeChanged) {
        	thatLR.isByDateFragmentTimeChanged = false;
        	labResultsTable.setModel(thatLR.oFinalLabResultByDateModel);
            thatLR.oFinalLabResultByDateModel.refresh(true);
        }
        
        thatLR.onLabResultsDateChange();
       
    },
    
    getFinalLabResultByDate : function(){
   	 var labResultsData = sap.ui.getCore().getModel("LabResultsDrFullScreenModel").getData().FinalLabResults ;
        thatLR.oFinalLabResultByDateModel = new sap.ui.model.json.JSONModel({"FinalLabResultByDateData": []});
        var arr = [] ;
        var ts = sap.ui.getCore().getModel("LabResultsDrTimestampsFullScreenModel").getData().LabResultMeasurementInfosData.length;
        for (var i = 0; i < labResultsData.length; i++) {
            for (var j = 0; j < ts ; j++) {
                if (labResultsData[i]["ResultValue_" + j]) {
                    var data = {
                        Date: labResultsData[i]["TimeStamp_" + j].toLocaleDateString(),
                        Time: com.ril.hn.emrpatient.util.Formatter.getFormattedTime_hhmm(labResultsData[i]["TimeStamp_" + j]),
                        Group: labResultsData[i].Group,
                        Test: labResultsData[i].Name,
                        value: labResultsData[i]["ResultValue_" + j],
                        abnormal : labResultsData[i]["Abnormal_" + j]
                    };
                    arr.push(data);
                }
            }
        }
        thatLR.oFinalLabResultByDateModel.getData().FinalLabResultByDateData = arr ;
   },
   
   onLabResultsByDateDialogClose: function(oEvent) {
       var date = sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_BY_DATE_DATEPICKER");
       date.setValueStateText("");
       date.setValueState("None");
       thatLR.LabResultsByDate.close();
   },

   onLabResultsDateChange: function(oEvent) {
	   ga( "send" , "event" , "ClinicalOVPhysician/LabResults/LabResByDtChng", "clicked");
	   
	   //on date change filter the lab test results
       var labResultsTable = sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_BY_DATE_TABL");
       var datepicker = sap.ui.getCore().byId("ID_PAT_DASH_LAB_RESULTS_BY_DATE_DATEPICKER");
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
       	datepicker.setValueStateText(thatLR.getView().getModel("i18n").getResourceBundle().getText("TXT_FUTURE_DATE_ERROR_OTHER"));
       	datepicker.setValueState("Error");
           return;
       }
       
       datepicker.setValueStateText("");
       datepicker.setValueState("None");
       
       var oFilter = new sap.ui.model.Filter("Date", sap.ui.model.FilterOperator.Contains, searchDate.toLocaleDateString());
       var oBinding = labResultsTable.getBinding("items");
       oBinding.filter([oFilter]);
   },
   
   getDateWiseTableTemplate: function(oEvent) {
       var oColumnListItemTempl = new sap.m.ColumnListItem({
           cells: [new sap.m.Text({
               text: "{Group}",
               wrapping: true
           }),new sap.m.Text({
               text: "{Test}",
               wrapping: true
           }), new sap.m.Text({
               text: "{Time}",
               wrapping: true
           }), new sap.m.ObjectStatus({
               text: "{value}",
               state : "{path: 'abnormal', formatter: 'com.ril.hn.emrpatient.util.Formatter.getLabResultValueStatus'}",
               wrapping: true
           })]
       });
       return oColumnListItemTempl;
   },
   
   createLabResultJSON : function(){
		/* Create new json 
		 * Groups and names in LabResultMeasureType ,
		 * Based on measure type id fetch result values for unique timestamp */
		var batchChanges = []; 
		var entityPath = thatLR.oDefaultParams.sEntityPath.replace(" ","%20");
		batchChanges.push( thatLR.oModel.createBatchOperation(entityPath + "/LabResultMeasureTypes" + thatLR.oDefaultParams.sFilterPath , "GET"));  
		batchChanges.push( thatLR.oModel.createBatchOperation(entityPath + "/LabResults" + thatLR.oDefaultParams.sFilterPath , "GET"));

		thatLR.oModel.addBatchReadOperations(batchChanges); 
		thatLR.oModel.submitBatch(function(oData, oResponse) { 
			//odata
			var oLabResultFSMeasureTypes = new sap.ui.model.json.JSONModel({"LabResultMeasureTypesData" :  oData.__batchResponses[0].data.results });
			var oLabResultsFS = new sap.ui.model.json.JSONModel({"LabResultsData" :   com.ril.hn.emrpatient.util.Formatter.getLRHHMMTimestamp("Timestamp",oData.__batchResponses[1].data.results)});
			var uniqueTimestamps = thatLR.getUniqueLabResultsTimestamps(  oData.__batchResponses[1].data.results );

			var labResultsTimestampsModel  = new sap.ui.model.json.JSONModel({"LabResultMeasurementInfosData" : uniqueTimestamps  });
			sap.ui.getCore().setModel(labResultsTimestampsModel , "LabResultsDrTimestampsFullScreenModel");
			
			var groupArr = [] ;
			var json = {} ;
			var labResultTempData = [];

			if(oLabResultsFS.getData().LabResultsData.length > 0){
				
			for(var i=0 ; i<oLabResultFSMeasureTypes.getData().LabResultMeasureTypesData.length ; i++){
				if(oLabResultFSMeasureTypes.getData().LabResultMeasureTypesData[i].Id !== "-"){

					json[ 'Group' ] = oLabResultFSMeasureTypes.getData().LabResultMeasureTypesData[i].Group ;
					json[ 'Name' ] = oLabResultFSMeasureTypes.getData().LabResultMeasureTypesData[i].Name ;
					json[ 'Id' ] = oLabResultFSMeasureTypes.getData().LabResultMeasureTypesData[i].Id ;

					for(var j=0 ; j< oLabResultsFS.getData().LabResultsData.length ; j++){

						if(oLabResultFSMeasureTypes.getData().LabResultMeasureTypesData[i].Id == oLabResultsFS.getData().LabResultsData[j].MeasureType){
							labResultTempData = [];
							for(var l=0; l<oLabResultsFS.getData().LabResultsData.length ; l++){
								if(oLabResultsFS.getData().LabResultsData[j].MeasureType == oLabResultsFS.getData().LabResultsData[l].MeasureType){
									labResultTempData.push(oLabResultsFS.getData().LabResultsData[l]);
								}
							}
							
							
							for(var k=0 ; k<labResultsTimestampsModel.getData().LabResultMeasurementInfosData.length ; k++){
								var obj;
								
								for (var m=0; m <labResultTempData.length; m++) {
							        if (labResultsTimestampsModel.getData().LabResultMeasurementInfosData[k].Timestamp.getTime()==labResultTempData[m].Timestamp.getTime()) {
							            obj = labResultTempData[m];
							        }
							    }
								//if(thatLR.oLabResults.getData().LabResultsData[j].Timestamp.getTime() == thatLR.oLabResultMeasurementInfos.getData().LabResultMeasurementInfosData[k].Timestamp.getTime()){
								if(obj!=null){
									json[ 'TimeStamp_' + k ] = labResultsTimestampsModel.getData().LabResultMeasurementInfosData[k].Timestamp ;
									json[ 'ResultValue_' + k ] = obj.ResultValue + " " +  obj.Abnormal;
									json[ 'Abnormal_' + k ] = obj.Abnormal ;
									json[ 'NormalRange_' + k ] = obj.NormalRange ;
									json[ 'ResultComment_' + k ] = obj.ResultComment ;
									json[ 'Title_' + k ]= obj.Title ;
									obj=null;
								}else{

									json[ 'TimeStamp_' + k ] =labResultsTimestampsModel.getData().LabResultMeasurementInfosData[k].Timestamp ;
									json[ 'ResultValue_' + k ] = "" ;
									json[ 'Abnormal_' + k ] = "" ;
									json[ 'NormalRange_' + k ] = "" ;
									json[ 'ResultComment_' + k ] = "" ;
									json[ 'Title_' + k ]= labResultsTimestampsModel.getData().LabResultMeasurementInfosData[k].Title ;
								}
							}
							break;
						}
						
					}

					if(json[ 'ResultValue_0'] == undefined){
						for(var k=0 ; k< labResultsTimestampsModel.getData().LabResultMeasurementInfosData.length ; k++){
							json[ 'TimeStamp_' + k ] = labResultsTimestampsModel.getData().LabResultMeasurementInfosData[k].Timestamp ;
							json[ 'ResultValue_' + k ] = "" ;
							json[ 'Abnormal_' + k ] = ""  ;
							json[ 'NormalRange_' + k ] = ""  ;
							json[ 'ResultComment_' + k ] = ""  ;
							json[ 'Title_' + k ]= labResultsTimestampsModel.getData().LabResultMeasurementInfosData[k].Title ;
						}
					}

					groupArr[groupArr.length] = json ;
					json = {} ;
				}
			}

			var labResultsModel = new sap.ui.model.json.JSONModel({"FinalLabResults" :  groupArr });  
			sap.ui.getCore().setModel(labResultsModel , "LabResultsDrFullScreenModel");
			
			thatLR._initLabResults(labResultsModel , labResultsTimestampsModel.getData().LabResultMeasurementInfosData);
			thatLR.getUniqueLabResultGroups();
			thatLR.getFinalLabResultByDate();
			
		 }else{
			    var labResultsModel = new sap.ui.model.json.JSONModel({"FinalLabResults" :  [] });  
				sap.ui.getCore().setModel(labResultsModel , "LabResultsDrFullScreenModel");
				
				var labResultsTable = thatLR.getView().byId("ID_PAT_DASH_LAB_RESULTS_FS_TABL");
				labResultsTable.removeAllColumns();
				labResultsTable.removeAllItems();
				labResultsTable.destroyItems();
				
				thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_LEFT").setVisible(false);
				thatLR.getView().byId("ID_LAB_RESULTS_FS_SCROLL_RIGHT").setVisible(false);
				thatLR.oLabResultUniqueGroups = new sap.ui.model.json.JSONModel({"LabResultUniqueGroupsData" :  [{"Group" : "No Groups available"}] }); 
				thatLR.oFinalLabResultByDateModel = new sap.ui.model.json.JSONModel({"FinalLabResultByDateData": []});
		 }
			thatLR.isByDateFragmentTimeChanged = true;
		} , function(oData, oResponse) { 
			com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");

			thatLR.labResultsModel.getData().FinalLabResults = [] ;
			thatLR._initLabResults(thatLR.labResultsModel , []);
			thatLR.getUniqueLabResultGroups();
			thatLR.getFinalLabResultByDate();
			thatLR.isByDateFragmentTimeChanged = false;
		});
	},

	getUniqueLabResultsTimestamps : function(data){
		// Filter LabResults for unique timestamps
		var arr = [] ;
		if(data.length > 0){
			data = com.ril.hn.emrpatient.util.Formatter.getLRHHMMTimestamp("Timestamp",data);
			arr[0] = data[0] ;
			for(var i = 0 ; i < data.length ; i++){
				for(var j = 0 ; j < arr.length ; j++){
					if( (data[i].Timestamp.getTime() !== arr [j].Timestamp.getTime())&& (j == (arr.length-1))){
						arr[arr.length] = data[i] ;
					}
				}
			}
		}
		return arr ;
	} ,

	
	
});
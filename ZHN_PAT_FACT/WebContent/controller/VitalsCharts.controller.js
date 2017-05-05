jQuery.sap.require("sap.ui.core.mvc.Controller");
jQuery.sap.require("com.ril.hn.emrpatient.util.Formatter");

sap.ui.core.mvc.Controller.extend("com.ril.hn.emrpatient.controller.VitalsCharts", {

	oDefaultParams: {
        sEntityPath: "",
        sFilterPath: "",
        bAllergyRefreshRequired: true
    },
    
    onInit: function() {

        //ga('send', 'emrpatientNurse');
        //ga('send', 'pageview', '/emrpatientDoctor/VitalsCharts_View');

        thatVC = this;

        this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView()));
        thatVC.i18n = this._oComponent.getModel("i18n").getResourceBundle();

        this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        this._oRouter.attachRoutePatternMatched(this._onRoutePatternMatched, this);
        
        //Fix for removal of this.getTransformToElement method - charts behaves abnormal otherwise
		SVGElement.prototype.getTransformToElement = SVGElement.prototype.getTransformToElement || function(elem) {
			return elem.getScreenCTM().inverse().multiply(this.getScreenCTM());
		}; 
    },

    _onRoutePatternMatched: function(oEvent) {
        // if not this page then return
        if (oEvent.getParameter("name") !== "PatientsVitalsCharts") {
            return;
        }
        ga("send", "pageview", "ClinicalOVPhysician/VitalsCharts");
        
        // if this page then initialize the screen
        thatVC = this;

        var patientHeaderModel = sap.ui.getCore().getModel("PatientHeaderModel");

        if (patientHeaderModel == undefined) {

            thatVC._oRouter.navTo("PatientOverview", {}, false);

        } else {

            thatVC.oModel = this.getView().getModel("VITALS_SRV");

            thatVC.getView().setModel(patientHeaderModel, "PatientHeader");
            thatVC.getView().bindElement("PatientHeader>/Patient/0");

            thatVC.oDefaultParams.sEntityPath = "/" + oEvent.getParameters().arguments.entity;
			
			thatVC.casesAndTimeIntervalsModel = sap.ui.getCore().getModel("CasesAndTimeIntervalsDrModel");
			thatVC.selectedCasesAndTimeIntervalsModel = sap.ui.getCore().getModel("SelectedCasesAndTimeIntervalsDrModel");
			
			thatVC.getVitalsChartsData();
			thatVC.initConfigData();
        }
    },

    initConfigData: function() {
    	thatVC.getView().setModel(sap.ui.getCore().getModel("ConfigModel"), "Config");
    	thatVC.getView().bindElement("Config>/ConfigData/0");
    },
    
    onNavBack: function() {
        window.history.go(-1);
    },


    getVitalsChartsData: function(entity) {
    	com.ril.hn.emrpatient.util.Utility.onBusyIndicatorOpen(thatVC);
    	thatVC.oPainScale = new sap.ui.model.json.JSONModel({"PainScaleData": []});
        thatVC.oRespiratoryRate = new sap.ui.model.json.JSONModel({"RespiratoryRateData": []});
        thatVC.oBloodGlucose = new sap.ui.model.json.JSONModel({"BloodGlucoseData": []});
        thatVC.oHeightWeight = new sap.ui.model.json.JSONModel({"HeightWeightData": []});
        
        var patId = sap.ui.getCore().getModel("PatientHeaderModel").getData().Patient[0].ExternalPatientId ;
        var caseId = thatVC.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.CaseId;
        var startDate = com.ril.hn.emrpatient.util.Formatter.getScoreChartsDateTime(thatVC.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.StartDate);
        var endDate = com.ril.hn.emrpatient.util.Formatter.getScoreChartsDateTime(thatVC.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.EndDate);
        
        var sPathPS = encodeURI("/VitalSignDisplaySet?$filter=IInstitute eq 'RFH1' and IPatient eq '" + patId +"' and ICase eq '"+ caseId +"' and IFromDat eq datetime'"+ startDate +"' and ITodate eq datetime'"+ endDate + "' and IVitalsign eq 'PAIN SCALE'");
        var sPathRR = encodeURI("/VitalSignDisplaySet?$filter=IInstitute eq 'RFH1' and IPatient eq '" + patId +"' and ICase eq '"+ caseId +"' and IFromDat eq datetime'"+ startDate +"' and ITodate eq datetime'"+ endDate +"' and IVitalsign eq 'RESP_RATE'");
      	var sPathBG = encodeURI("/VitalSignDisplaySet?$filter=IInstitute eq 'RFH1' and IPatient eq '" + patId +"' and ICase eq '"+ caseId +"' and IFromDat eq datetime'"+ startDate +"' and ITodate eq datetime'"+ endDate +"' and IVitalsign eq 'BLDGLU'");
        var sPathHT = encodeURI("/VitalSignDisplaySet?$filter=IInstitute eq 'RFH1' and IPatient eq '" + patId +"' and ICase eq '"+ caseId +"' and IFromDat eq datetime'"+ startDate +"' and ITodate eq datetime'"+ endDate +"' and IVitalsign eq 'HGHT'");
        var sPathWT = encodeURI("/VitalSignDisplaySet?$filter=IInstitute eq 'RFH1' and IPatient eq '" + patId +"' and ICase eq '"+ caseId +"' and IFromDat eq datetime'"+ startDate +"' and ITodate eq datetime'"+ endDate +"' and IVitalsign eq 'WGHT'");
        
       com.ril.hn.emrpatient.util.DataManager.readBatchData([sPathPS, sPathRR, sPathBG, sPathHT, sPathWT], thatVC.oModel, thatVC.onVitalsFSReadSuccess, thatVC.onVitalsFSReadError);
        
    },

    onVitalsFSReadSuccess : function(oData, oResponse, oRefData) {
    	var batchError = '', msg = "";
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
        	//sort all data
        	var arrPS = oData.__batchResponses[0].data.results ;
        	arrPS.sort(thatVC.sortVitalsTimestamps);
        	var arrRR = oData.__batchResponses[1].data.results ;
        	arrRR.sort(thatVC.sortVitalsTimestamps);
        	var arrBG = oData.__batchResponses[2].data.results ;
        	arrBG.sort(thatVC.sortVitalsTimestamps);
        	
        	//club height weight data
        	var arrHTWT = thatVC.getCombinedHeightWeight(oData.__batchResponses[3].data.results.sort(thatVC.sortVitalsTimestamps),oData.__batchResponses[4].data.results.sort(thatVC.sortVitalsTimestamps));
        	thatVC.oHeightWeight = new sap.ui.model.json.JSONModel({"HeightWeightData": arrHTWT});
        	
        	thatVC.oPainScale = new sap.ui.model.json.JSONModel({"PainScaleData": arrPS});
        	thatVC.oRespiratoryRate = new sap.ui.model.json.JSONModel({"RespiratoryRateData":  arrRR});
        	thatVC.oBloodGlucose = new sap.ui.model.json.JSONModel({"BloodGlucoseData": arrBG});
        	thatVC.oHeightWeight = new sap.ui.model.json.JSONModel({"HeightWeightData": arrHTWT});
        } else {
            com.ril.hn.emrpatient.util.Utility.displayError(msg, "ERROR", "Alert");
        }
        thatVC._initVitalsCharts();
    },

    onVitalsFSReadError : function(oData, oResponse, oRefData) {
    	thatVC.oPainScale = new sap.ui.model.json.JSONModel({"PainScaleData": []});
        thatVC.oRespiratoryRate = new sap.ui.model.json.JSONModel({"RespiratoryRateData": []});
        thatVC.oBloodGlucose = new sap.ui.model.json.JSONModel({"BloodGlucoseData": []});
        thatVC.oHeightWeight = new sap.ui.model.json.JSONModel({"HeightWeightData": []});
        thatVC._initVitalsCharts();
        com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
    },
    
    
    sortVitalsTimestamps : function(a,b){
    	//sort timestamps since it doesnt come in order
    	if( a.Valtimestamp.getTime() > b.Valtimestamp.getTime()){
            return 1;
        }else if( a.Valtimestamp.getTime() < b.Valtimestamp.getTime() ){
            return -1;
        }
        return 0;
    	//return a.Valtimestamp.getTime() - b.Valtimestamp.getTime;
    },

    _initVitalsCharts: function() {
    	thatVC.getView().byId("ID_PAT_DASH_OBJ_HEADER_VITALS_CHARTS_TIME_FILTER").setText(thatVC.selectedCasesAndTimeIntervalsModel.getData().SelectedCasesAndTimeIntervalsData.Label);
        
        thatVC._initPainScaleChart();
        thatVC._initRespiratoryRateChart();
        thatVC._initBloodGlucoseChart();
        thatVC._initHeightWeightChart();
        com.ril.hn.emrpatient.util.Utility.onBusyIndicatorClose(thatVC);
    },

    _initPainScaleChart: function() {
    	var arr = [];
        if (thatVC.oPainScale.getData().PainScaleData.length == 0) {
            var j = { "Valtimestamp" : "" , "ValueBar" : 0 ,"Value" : 0};
            arr.push(j);
        } else {
            var painScaleData = thatVC.oPainScale.getData().PainScaleData;
            for (var i = 0; i < painScaleData.length; i++) {
                var j = painScaleData[i];
                j['ValueBar'] = 0;
                arr.push(j);
            }
        }
        thatVC.oPainScale.getData().PainScaleData = arr;
        
            thatVC.painScaleChart = thatVC.getView().byId("ID_VITALS_CHARTS_PAIN_SCALE");
            thatVC.painScaleChart.destroyFeeds();
            thatVC.painScaleChart.setVisible(true);
            var painScalePopover = new sap.viz.ui5.controls.Popover();

            var oDimension = [{
                name: 'Date and Time',
                value: "{path: 'Valtimestamp', formatter:  'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTimeOffest'}"
            }];
            var oMeasure = [{
                name: 'Legend',
                value: '{ValueBar}'
            }, {
                name: 'Value',
                value: "{path : 'Value' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getChartValue'}"
            }];
            com.ril.hn.emrpatient.util.UiControlManager.initChartsControl(that, thatVC.painScaleChart, painScalePopover , oDimension, oMeasure, thatVC.i18n.getText("TXT_SCORES_CHARTS_PAIN_SCALE_TITLE"), "PainScaleData");
            if (thatVC.oPainScale.getData().PainScaleData.length == 0) {
                thatVC.painScaleChart.setVisible(false);
            }
            thatVC.painScaleChart.setModel(thatVC.oPainScale);
    },


    _initRespiratoryRateChart : function() {
       var arr = [];
        if (thatVC.oRespiratoryRate.getData().RespiratoryRateData.length == 0) {
            var j = { "Valtimestamp " : "" , "ValueBar" : 0 ,"Value" : 0};
            arr.push(j);
        } else {
        	var respiratoryRateData = thatVC.oRespiratoryRate.getData().RespiratoryRateData;
            for (var i = 0; i < respiratoryRateData.length; i++) {
                var j = respiratoryRateData[i];
                j['ValueBar'] = 0;
                arr.push(j);
            }
        }
         thatVC.oRespiratoryRate.getData().RespiratoryRateData = arr;
         
         thatVC.respiratoryRateChart = thatVC.getView().byId("ID_VITALS_CHARTS_RESPIRATORY_RATE");
         thatVC.respiratoryRateChart.destroyFeeds();
             thatVC.respiratoryRateChart.setVisible(true);
             var respiratoryRatePopover = new sap.viz.ui5.controls.Popover();

             var oDimension = [{
                 name: 'Date and Time',
                 value: "{path: 'Valtimestamp', formatter:  'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTimeOffest'}"
             }];
             var oMeasure = [{
                 name: 'Legend',
                 value: '{ValueBar}'
             }, {
                 name: 'Value',
                 value: "{path : 'Value' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getChartValue'}"
             }];
             com.ril.hn.emrpatient.util.UiControlManager.initChartsControl(that, thatVC.respiratoryRateChart, respiratoryRatePopover , oDimension, oMeasure, thatVC.i18n.getText("TXT_VITALS_CHARTS_RESPIRATORY_RATE_TITLE"), "RespiratoryRateData");
             if (thatVC.oRespiratoryRate.getData().RespiratoryRateData.length == 0) {
                 thatVC.respiratoryRateChart.setVisible(false);
             }
             thatVC.respiratoryRateChart.setModel(thatVC.oRespiratoryRate);
    },

    _initBloodGlucoseChart : function() {
    	var arr = [];
        if (thatVC.oBloodGlucose.getData().BloodGlucoseData.length == 0) {
            var j = { "Valtimestamp " : "" , "ValueBar" : 0 ,"Value" : 0};
            arr.push(j);
        } else {
        	var bloodGlucoseData = thatVC.oBloodGlucose.getData().BloodGlucoseData;
            for (var i = 0; i < bloodGlucoseData.length; i++) {
                var j = bloodGlucoseData[i];
                j['ValueBar'] = 0;
                arr.push(j);
            }
        }
         thatVC.oBloodGlucose.getData().BloodGlucoseData = arr;
         
         thatVC.bloodGlucoseChart = thatVC.getView().byId("ID_VITALS_CHARTS_BLOOD_GLUCOSE");
         thatVC.bloodGlucoseChart.destroyFeeds();
         thatVC.bloodGlucoseChart.setVisible(true);
         var bloodGlucosePopover = new sap.viz.ui5.controls.Popover();
         
         var oDimension = [{
             name: 'Date and Time',
             value: "{path: 'Valtimestamp', formatter:  'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTimeOffest'}"
         }];
         var oMeasure = [{
             name: 'Legend',
             value: '{ValueBar}'
         }, {
             name: 'Value',
             value: "{path : 'Value' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getChartValue'}"
         }];
         com.ril.hn.emrpatient.util.UiControlManager.initChartsControl(that, thatVC.bloodGlucoseChart, bloodGlucosePopover , oDimension, oMeasure, thatVC.i18n.getText("TXT_VITALS_CHARTS_BLOOD_GLUCOSE_TITLE"), "BloodGlucoseData");
         if (thatVC.oBloodGlucose.getData().BloodGlucoseData.length == 0) {
             thatVC.bloodGlucoseChart.setVisible(false);
         }
         thatVC.bloodGlucoseChart.setModel(thatVC.oBloodGlucose);
         
    },

    getCombinedHeightWeight : function(arrHt,arrWt){
    	//get unique timestamps
    	var arrComb = arrHt.concat(arrWt);
    	var uniq = thatVC.getUniqueTimestamps(arrComb);
    	//form the array
    	for(var i = 0 ; i < arrComb.length ; i++){
			for(var j = 0 ; j < uniq.length ; j++){
				if(arrComb[i].Valtimestamp.getTime() === uniq[j].Valtimestamp.getTime()){
					if(arrComb[i].VitalSignId=="HGHT")
						uniq[j].HeightValue = arrComb[i].Value;
					else if(arrComb[i].VitalSignId=="WGHT")
						uniq[j].WeightValue = arrComb[i].Value;
				}
			}
		}
    	return uniq;
    },
    
    getUniqueTimestamps : function(data){
		var arr = [] ;
		if(data.length > 0){
			data = com.ril.hn.emrpatient.util.Formatter.getLRHHMMTimestamp("Valtimestamp",data);
			arr[0] = data[0] ;
			for(var i = 0 ; i < data.length ; i++){
				for(var j = 0 ; j < arr.length ; j++){
					if(data[i].Valtimestamp.getTime() === arr [j].Valtimestamp.getTime())
						break
					else if(j == (arr.length-1))
							arr[arr.length] = data[i] ;
				}
			}
		}
		return arr ;
	} ,
    
	_initHeightWeightChart : function(){
    	thatVC.heightWeightChart = thatVC.getView().byId("ID_VITALS_CHARTS_HEIGHT_WEIGHT");
        thatVC.heightWeightChart.destroyFeeds();
        
        if (thatVC.oHeightWeight.getData().HeightWeightData.length == 0) {
            var j = { "Valtimestamp " : "" , "HeightValue" : 0 ,"WeightValue" : 0};
            thatVC.oHeightWeight.getData().HeightWeightData[0] = j;
        }
        
        thatVC.heightWeightChart = thatVC.getView().byId("ID_VITALS_CHARTS_HEIGHT_WEIGHT");
        thatVC.heightWeightChart.destroyFeeds();
        var heightWeightPopover = new sap.viz.ui5.controls.Popover();
        
        var oDimension = [{
            name: 'Date and Time',
            value: "{path: 'Valtimestamp', formatter:  'com.ril.hn.emrpatient.util.Formatter.getFormattedDateAndTimeOffest'}"
        }];
        var oMeasure = [{
            name: 'Height(cm)',
            value: "{path : 'HeightValue' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getChartFloatValue'}"
        }, {
            name: 'Weight(kg)',
            value: "{path : 'WeightValue' , formatter : 'com.ril.hn.emrpatient.util.Formatter.getChartFloatValue'}"
        }];
        com.ril.hn.emrpatient.util.UiControlManager.initChartsControl(that, thatVC.heightWeightChart, heightWeightPopover , oDimension, oMeasure, thatVC.i18n.getText("TXT_VITALS_CHARTS_HEIGHT_WEIGHT_TITLE"), "HeightWeightData");
        if (thatVC.oHeightWeight.getData().HeightWeightData.length == 0) {
            thatVC.heightWeightChart.setVisible(false);
        }
        thatVC.heightWeightChart.setModel(thatVC.oHeightWeight);
    }
	
});
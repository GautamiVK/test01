jQuery.sap.declare("com.ril.hn.emrpatient.util.CaseAndTimeIntervalManager");

com.ril.hn.emrpatient.util.CaseAndTimeIntervalManager = {

    onOpenCaseAndTimeIntervalDialog : function(oContext,oCasesAndTimeIntervals,sEntitypath,oModel,iSelectedIndex,handleCasesAndTimeIntervalsClose){
			var oItem = {
                Title: "{Label}",
                Description: "{SecondLabel}"
            };

            if (!oCasesAndTimeIntervals || oCasesAndTimeIntervals.getData().CasesAndTimeIntervalsData.length == 0) {
                oCasesAndTimeIntervals = new sap.ui.model.json.JSONModel({
                    "CasesAndTimeIntervalsData": []
                });
                var sPath = sEntitypath + "/TimeIntervals";
                com.ril.hn.emrpatient.util.DataManager.readData(sPath, oModel, null, null, null, function(oData, oResponse, oRefData) {
                    oCasesAndTimeIntervals.getData().CasesAndTimeIntervalsData = oData.results;
                    var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(oContext , "oCasesAndTimeIntervalsDialog", "Cases And Time Intervals", "/CasesAndTimeIntervalsData", oItem, this.handleCasesAndTimeIntervalsSearch, handleCasesAndTimeIntervalsClose);
                    vh.setModel(oCasesAndTimeIntervals);
                    oContext.oCasesAndTimeIntervalsDialog.getItems()[iSelectedIndex].setSelected(true);
                    vh.open();
                }, function(oData, oResponse, oRefData) {
                    com.ril.hn.emrpatient.util.Utility.displayError(oData, "ERROR", "Alert");
                });
            } else {
                if (oCasesAndTimeIntervals.getData().CasesAndTimeIntervalsData.length) {
                    var vh = com.ril.hn.emrpatient.util.Utility.onValueHelpOpen(oContext, "oCasesAndTimeIntervalsDialog", "Cases And Time Intervals", "/CasesAndTimeIntervalsData", oItem, this.handleCasesAndTimeIntervalsSearch, handleCasesAndTimeIntervalsClose);
                    vh.setModel(oCasesAndTimeIntervals);
                    oContext.oCasesAndTimeIntervalsDialog.getItems()[iSelectedIndex].setSelected(true);
                    vh.open();
                }
            }

    },
    
     handleCasesAndTimeIntervalsSearch: function(oEvent) {
        var sValue = oEvent.getParameter("value");
        var oTitleFilter = new sap.ui.model.Filter("Label", sap.ui.model.FilterOperator.Contains, sValue);
        oEvent.getSource().getBinding("items").filter([oTitleFilter]);
    },
    
    getAllCasesSorted : function(results,type){
    	var arr = [] , t="";
    	switch(type){
	    	case "IP" : t="Inpatient"; break;
	    	case "OP" : t="Outpat"; break;
    	}
    	//get all outpatient/inpatient cases 
    	$.each(results,function(i,item){
    		if(item.Label.search(t)!==-1){
    			item['SelectedIndex'] = i;
    			arr.push(item);
    		}
    	});
    	//sort by the latest ending date
    	arr.sort(function(a,b){
    		var d1 = new Date(a.EndDate).getTime() - (5*60*60*1000+30*60*1000);
    		var d2 = new Date(b.EndDate).getTime() - (5*60*60*1000+30*60*1000);
    		return (d1>=d2)?-1:1;
    	});
    	return arr;
    }
};
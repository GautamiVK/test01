jQuery.sap.declare("com.ril.hn.emrpatient.util.LabResultsManager");

com.ril.hn.emrpatient.util.LabResultsManager = {

		getFinalLabResults : function(oLabResults,oLabResultMeasureTypes,oLabResultMeasurementInfos){
	    	var groupArr = [] ;
			var json = {} ;
			var labResultTempData = [];
			
			//loop only if timestamps are available
			if(oLabResults.getData().LabResultsData.length > 0){
				
			for(var i=0 ; i<oLabResultMeasureTypes.getData().LabResultMeasureTypesData.length ; i++){
				if(oLabResultMeasureTypes.getData().LabResultMeasureTypesData[i].Id !== "-"){

					json[ 'Group' ] = oLabResultMeasureTypes.getData().LabResultMeasureTypesData[i].Group ;
					json[ 'Name' ] = oLabResultMeasureTypes.getData().LabResultMeasureTypesData[i].Name ;
					json[ 'Id' ] = oLabResultMeasureTypes.getData().LabResultMeasureTypesData[i].Id ;

					for(var j=0 ; j< oLabResults.getData().LabResultsData.length ; j++){

						if(oLabResultMeasureTypes.getData().LabResultMeasureTypesData[i].Id == oLabResults.getData().LabResultsData[j].MeasureType){
							labResultTempData = [];
							for(var l=0; l<oLabResults.getData().LabResultsData.length ; l++){
								if(oLabResults.getData().LabResultsData[j].MeasureType == oLabResults.getData().LabResultsData[l].MeasureType){
									labResultTempData.push(oLabResults.getData().LabResultsData[l]);
								}
							}
							
							for(var k=0 ; k<oLabResultMeasurementInfos.getData().LabResultMeasurementInfosData.length ; k++){
								var obj;
								
								for (var m=0; m <labResultTempData.length; m++) {
							        if (oLabResultMeasurementInfos.getData().LabResultMeasurementInfosData[k].Timestamp.getTime()==labResultTempData[m].Timestamp.getTime()) {
							            obj = labResultTempData[m];
							        }
							    }
								//if(oLabResults.getData().LabResultsData[j].Timestamp.getTime() == oLabResultMeasurementInfos.getData().LabResultMeasurementInfosData[k].Timestamp.getTime()){
								if(obj!=null){
									json[ 'TimeStamp_' + k ] = oLabResultMeasurementInfos.getData().LabResultMeasurementInfosData[k].Timestamp ;
									json[ 'ResultValue_' + k ] = obj.ResultValue + " " +  obj.Abnormal;
									json[ 'Abnormal_' + k ] = obj.Abnormal ;
									json[ 'NormalRange_' + k ] = obj.NormalRange ;
									json[ 'ResultComment_' + k ] = obj.ResultComment ;
									json[ 'Title_' + k ]= obj.Title ;
									obj=null;
								}else{

									json[ 'TimeStamp_' + k ] = oLabResultMeasurementInfos.getData().LabResultMeasurementInfosData[k].Timestamp ;
									json[ 'ResultValue_' + k ] = "" ;
									json[ 'Abnormal_' + k ] = "" ;
									json[ 'NormalRange_' + k ] = "" ;
									json[ 'ResultComment_' + k ] = "" ;
									json[ 'Title_' + k ]= oLabResultMeasurementInfos.getData().LabResultMeasurementInfosData[k].Title ;
								}
							}
							break;
						}
					}

					if(json[ 'ResultValue_0'] == undefined){
						for(var k=0 ; k<oLabResultMeasurementInfos.getData().LabResultMeasurementInfosData.length ; k++){
							json[ 'TimeStamp_' + k ] = oLabResultMeasurementInfos.getData().LabResultMeasurementInfosData[k].Timestamp ;
							json[ 'ResultValue_' + k ] = "" ;
							json[ 'Abnormal_' + k ] = ""  ;
							json[ 'NormalRange_' + k ] = ""  ;
							json[ 'ResultComment_' + k ] = ""  ;
							json[ 'Title_' + k ]= oLabResultMeasurementInfos.getData().LabResultMeasurementInfosData[k].Title ;
						}
					}

					groupArr[groupArr.length] = json ;
					json = {} ;
				}
			}
			return groupArr;
			}else{
				return [];
			}
	    }
};
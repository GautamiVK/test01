jQuery.sap.declare("com.ril.hn.emrpatient.util.DataManager");

com.ril.hn.emrpatient.util.DataManager = {
		
		/*
		init : function(oModel,oResourceBundle){
			_oModel = oModel;
			_oResourceBundle = oResourceBundle;
		},*/
		
		setDataByProperty : function(sProperty,oValue){
			_oItem[sProperty] = oValue;
		},
		
		getDataByProperty : function(sProperty){
			return _oItem[sProperty];
		},
		
		//READ
		readData : function(sPath,oModel,oContext,aParams,oRefData,successCallback,errorCallback){
			oModel.read(sPath,oContext,aParams,true,function(oData,oResponse){
				successCallback(oData,oResponse,oRefData);
			},function(oData,oResponse,oRefData){
				errorCallback(oData,oResponse,oRefData);
			});	
		},
		
		//create
		createData : function(sPath,oModel,oContext,aParams,oData,oRefData,successCallback,errorCallback){
			oModel.create(sPath,oData,oContext,function(oData,oResponse){
				successCallback(oData,oResponse,oRefData);
			},function(oData,oResponse,oRefData){
				errorCallback(oData,oResponse,oRefData);
			});	
		},
		
		removeData : function(sPath,oModel,oContext,aParams,oData,oRefData,successCallback,errorCallback){
			oModel.remove(sPath,oData,function(oData,oResponse){
				successCallback(oData,oResponse,oRefData);
			},function(oData,oResponse,oRefData){
				errorCallback(oData,oResponse,oRefData);
			});	
		},
		
		//create
		updateData : function(sPath,oModel,oContext,aParams,oData,oRefData,successCallback,errorCallback){
			oModel.update(sPath,oData,oContext,function(oData,oResponse){
				successCallback(oData,oResponse,oRefData);
			},function(oData,oResponse,oRefData){
				errorCallback(oData,oResponse,oRefData);
			});	
		},
		
		readBatchData : function(aPaths,oModel,successCallback,errorCallback){
			var batchChanges = [];
			$.each(aPaths, function (index,value) {
				batchChanges.push(oModel.createBatchOperation(aPaths[index], "GET"));
		    });
			oModel.addBatchReadOperations(batchChanges);
			oModel.submitBatch(function(oData,oResponse) {
				successCallback(oData,oResponse);
	        },function(oData,oResponse){
	        	errorCallback(oData,oResponse);
	        });
		},
		
		//READ PATIENT LIST
		getPatientList : function(){
			var sPath = "";
			var aParams = [];
			_oModel.getData(sPath,null,aParams,function(oData,oResponse){
				
			},function(oData,oResponse){
				
			});
		}
		
};
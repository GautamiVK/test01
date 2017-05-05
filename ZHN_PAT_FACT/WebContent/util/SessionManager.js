jQuery.sap.declare("com.ril.hn.emrpatient.util.SessionManager");

com.ril.hn.emrpatient.util.SessionManager = {
		
		initSessionObject : function(appType){
			if(typeof(Storage) !== "undefined") {
				if(appType=="IP"){
					sessionStorage.fioriHNWard = (sessionStorage.fioriHNWard==undefined || sessionStorage.fioriHNWard == "my_appointments")? "my_patients" : sessionStorage.fioriHNWard;
					sessionStorage.fioriHNWardUnit = (sessionStorage.fioriHNWardUnit==undefined || sessionStorage.fioriHNWardUnit == "" )? "" : sessionStorage.fioriHNWardUnit ;
					sessionStorage.mastertitle = (sessionStorage.mastertitle==undefined ||sessionStorage.mastertitle == "My Appointments" ) ? "My Patients" : sessionStorage.mastertitle
				}else if(appType=="OP"){
					sessionStorage.fioriHNWard = "my_appointments" ;
					sessionStorage.fioriHNWardUnit = "" ;
					sessionStorage.mastertitle = "My Appointments";
				}
			}
		},
		
		getSessionObject : function(appType){
			var oSession = {};
			if(typeof(Storage) !== "undefined") {
				oSession = {
						searchName : sessionStorage.fioriHNWard,
						searchParam : sessionStorage.fioriHNWardUnit,
						ward : sessionStorage.mastertitle
				};
			}else{
				if(appType=="IP"){
					oSession = {
							searchName : "my_patients" ,
							searchParam : "" ,
							ward : "My Patients"
					};
				}else if(appType=="OP"){
					oSession = {
							searchName : "my_appointments" ,
							searchParam : "" ,
							ward : "My Appointments"
					};
				}
			}
			return oSession;
		},
		
		setSessionObject : function(searchName,searchParam,ward){
			if(typeof(Storage) !== "undefined") {
    		    sessionStorage.fioriHNWard = searchName;
    		    sessionStorage.fioriHNWardUnit = searchParam;
    		    sessionStorage.mastertitle = ward;
    	    }
		},
		
};
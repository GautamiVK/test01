jQuery.sap.declare("com.ril.hn.emrpatient.util.OrderManager");

com.ril.hn.emrpatient.util.OrderManager = {

    onCreateClinicalOrder: function(oPatient, oCase) {
        var ites = window.location.host;
        var devpatt = new RegExp("dev");
        var devflag = devpatt.test(ites);
        var urlites = "";
        if (devflag == true) {
            urlites = "http://deveped1.ril.com:50100";
        } else {
            var qapatt = new RegExp("qa");
            var qaflag = qapatt.test(ites);
            if (qaflag == true) {
                urlites = "http://qasepeq1.ril.com:50000";
            } else {
                urlites = "http://myportal.ril.com";
            }
        }
        if (oCase.CaseId !== "") {
            var dynm = "ApplicationParameter=P_EINRI=RFH1;P_PATNR=" + oPatient.ExternalPatientId + ";P_FALNR=" + oCase.CaseId + ";";
            sap.m.URLHelper.redirect(urlites + "/irj/servlet/prt/portal/prteventname/Navigate/prtroot/com.sap.portal.appintegrator.sap.Transaction?System=SAP_RFH&TCode=zishco&GuiType=WinGui&" + dynm + "&DynamicParameter=&AutoStart=true&OkCode=1000&UseSPO1=false&DebugMode=false&$action=go&AppIntegratorVariant=com.sap.portal.appintegrator.sap.Transaction", true);
        } else {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_VALID_CASE_ERROR"), "INFORMATION", "Info");
        }
    },

    onCreateMedicationOrder: function(oPatient, oCase) {
        var dynm = "ApplicationParameter=P_EINRI=RFH1;P_FALNR=" + oCase.CaseId + ";";
        var ites = window.location.host;
        var devpatt = new RegExp("dev");
        var devflag = devpatt.test(ites);
        var urlites = "";
        if (devflag == true) {
            urlites = "http://deveped1.ril.com:50100";
        } else {
            var qapatt = new RegExp("qa");
            var qaflag = qapatt.test(ites);
            if (qaflag == true) {
                urlites = "http://qasepeq1.ril.com:50000";
            } else {
                urlites = "http://myportal.ril.com";
            }
        }
        if (oCase.CaseId !== "") {
            sap.m.URLHelper.redirect(urlites + "/irj/servlet/prt/portal/prteventname/Navigate/prtroot/com.sap.portal.appintegrator.sap.Transaction?System=SAP_RFH&TCode=zish_mo&GuiType=WinGui&" + dynm + "&DynamicParameter=&AutoStart=true&OkCode=1000&UseSPO1=false&DebugMode=false&$action=go&AppIntegratorVariant=com.sap.portal.appintegrator.sap.Transaction", true);
        } else {
            com.ril.hn.emrpatient.util.Utility.displayError(that.i18n.getText("TXT_VALID_CASE_ERROR"), "INFORMATION", "Info");
        }

    },


    getDiagnosisCreateURL: function(oPatient, oCase, oWebFacets) {
        if (oCase.CaseId !== "") {
            var appurl = "";
            var facets = oWebFacets.getData().WebFacetsData;
            for (var i = 0; i < facets.length; i++) {
                if (facets[i].Id.indexOf("Diagnosis") > -1) {
                    appurl = facets[i].Url;
                }
            }
            var protocol = window.location.protocol;
            appurl = appurl.split(/:(.+)?/)[1];
            appurl = protocol + appurl;
            var pathpart1 = appurl.split("&INSTITUTION")[0];
            var pathpart2 = "&INSTITUTION=RFH1";
            var pathpart3 = "&PATIENTID=" + oPatient.ExternalPatientId;
            var pathpart4 = "&CASEID=" + oCase.CaseId;
            var pathpart5 = "&DEPARTMENT=" + encodeURI(oPatient.ThirdLine);
            var pathpart6 = "&DATE=" + encodeURI(oPatient.Grouping);
            var path = pathpart1 + pathpart2 + pathpart3 + pathpart4 + pathpart5 + pathpart6;
            return path;
        }
    },
    
    onOpenImageServerURL : function(oContext,oPatient,oCase){
		var	customField1 = oCase.CustomField1;
		var customField2 = oCase.CustomField2;

		var encpatid = encuserid = encTimestamp = "" ;
		if(window.btoa){
			 encpatid = btoa(oPatient.ExternalPatientId);
			 encuserid = btoa(customField2);
			 encTimestamp = btoa(customField1);
		}else{
			 encpatid = base64.encode(oPatient.ExternalPatientId);
			 encuserid = base64.encode(customField2);
			 encTimestamp = base64.encode(customField1);
		}

		var object = oContext;
		var host = window.location.host;
		var devpat = new RegExp("dev");
		var devflg = devpat.test(host);
		
		if (devflg == true) {
				object.form = $('<form target="_blank" action="http://telcoworkmandev.ril.com/HIS/viewImages" method="post" style="display:none;" id="form123"></form>');
				$("<input type='hidden' name='mrn' value ='"+ encpatid + "'/>").appendTo(object.form);
				$("<input type='hidden' name='user' value ='"+ encuserid + "'/>").appendTo(object.form);
				$("<input type='hidden' name='timestamp' value ='"+ encTimestamp + "'/>").appendTo(object.form);
		}else {
				var qapat = new RegExp("qa");
				var qaflg = qapat.test(host);
				if (qaflg == true) {
						object.form = $('<form target="_blank" action="https://gatewayqa.ril.com/HIS/viewImages" method="post" style="display:none;" id="form123"></form>');
						$("<input type='hidden' name='mrn' value ='"+ encpatid + "'/>").appendTo(object.form);
						$("<input type='hidden' name='user' value ='"+ encuserid + "'/>").appendTo(object.form);
						$("<input type='hidden' name='timestamp' value ='"+ encTimestamp + "'/>").appendTo(object.form);
				} else {
						object.form = $('<form target="_blank" action="https://mobhnh.ril.com/HIS/viewImages" method="post" style="display:none;" id="form123"></form>');
						$("<input type='hidden' name='mrn' value ='"+ encpatid + "'/>").appendTo(object.form);
						$("<input type='hidden' name='user' value ='"+ encuserid + "'/>").appendTo(object.form);
						$("<input type='hidden' name='timestamp' value ='"+ encTimestamp + "'/>").appendTo(object.form);
				}

		}
		object.form.appendTo("body").submit();
    },
    
    onSAPLogonOpen : function() {
    	var ites = window.location.host;
		var devpatt = new RegExp("dev");      
		var devflag = devpatt.test(ites);
		var urlites =  "";
		if (devflag == true){
			urlites="http://deveped1.ril.com:50100";
		}else{
			var qapatt = new RegExp("qa");      
			var qaflag = qapatt.test(ites); 
			if (qaflag == true){
				urlites="http://qasepeq1.ril.com:50000";              
			}else{
				urlites="http://myportal.ril.com";
			}
		}
		sap.m.URLHelper.redirect(urlites+"/irj/servlet/prt/portal/prteventname/Navigate/prtroot/com.sap.portal.appintegrator.sap.Transaction?AppIntegratorVariant=com.sap.portal.appintegrator.sap.Transaction&AutoStart=true&$action=go&DebugMode=false&GuiType=WinGui&System=SAP_RFH&TCode=nwp1&UseSPO1=false", true);
	
    },
    
    getSOAPNoteURL : function(oPatient, oCase, oWebFacets){
    	if (oCase.CaseId !== "") {
            var appurl = "";
            var facets = oWebFacets.getData().WebFacetsData;
            for (var i = 0; i < facets.length; i++) {
                if (facets[i].Id.indexOf("PMD UI5") > -1) {
                    appurl = facets[i].Url;
                }
            }
            var protocol = window.location.protocol;
            appurl = appurl.split(/:(.+)?/)[1];
            appurl = protocol + appurl;
            var pathpart1 = appurl.split("&PATIENTID=")[0];
            var pathpart2 = "&PATIENTID=" + oPatient.ExternalPatientId;
            var pathpart3 = "&CASEID=" + oCase.CaseId;
            var pathpart4 = "&INSTITUTION=RFH1";
            var pathpart5 = "&DATE=" + encodeURI(oPatient.Grouping);
            var pathpart6 = "&DEPARTMENT=" + encodeURI(oPatient.ThirdLine);
            var path = pathpart1 + pathpart2 + pathpart3 + pathpart4 + pathpart5 + pathpart6;
            return path;
        }
   }
    
};
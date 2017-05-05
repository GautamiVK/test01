jQuery.sap.declare("com.ril.hn.emrpatient.util.Formatter");
jQuery.sap.require("sap.ca.ui.model.format.DateFormat");
com.ril.hn.emrpatient.util.Formatter =  {
	
		//formatter for status icon visibility
		isIconVisible : function(value) {
			if (value == "true")
				return true;
			else 
				return false ;
		},
		
		getPatientAge : function(date) {	
			var birthdate = new Date(date);
			var today = new Date();
			var timeDiff = Math.abs(today.getTime() - birthdate.getTime());
			var daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24 ));
			daysDiff = parseInt(daysDiff) ;
			if(daysDiff <= 30){
				if(daysDiff == 0)
					return  "Newborn" ;
				else if(daysDiff == 1)
					 return daysDiff + " Day";
				else 
					return daysDiff + " Days";
			}else if(daysDiff <= 365){
				var monthsDiff = parseInt(daysDiff / 30);
				if(monthsDiff > 1)
				 return monthsDiff + " Months";
				else 
				 return monthsDiff + " Month";
			}
			else{
				var yearsDiff = parseInt( daysDiff / 365 );
				if(yearsDiff > 1)
					 return yearsDiff + " Years";
					else 
					 return yearsDiff + " Year";
			}
			
		},
		
		getPatientGender : function(gender){
			switch(gender){
			case "M" : return "Male";
					   break;
			case "F" : return "Female";
			           break;
			case "U" : return "Unknown";
			   		   break;
			}
		},
		
		getFormattedDate : function(oDate){
			if (oDate == undefined)
				return "";
			var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
				pattern : "dd.MM.YYYY"
			});
			//oDate = new Date(oDate.replace(/-/g, "/")); //.replace(/[a-z]+/gi, ' '));
			return oDateFormat.format(oDate);
		},
		
		getFormattedDate_DOB_safari : function(oDate){
			if (oDate == undefined)
				return "";
			var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
				pattern : "dd.MM.YYYY"
			});
			oDate = new Date(oDate.replace(/-/g, "/")); //.replace(/[a-z]+/gi, ' '));
			return oDateFormat.format(oDate);
		},
		
		
		getPatientClincalDesc : function(oValue){
			if (oValue == undefined||oValue == "")
				return "N/A";
			else
				return oValue;
		},
		
		getFilterSubname : function(valSub , valSearch){
			if(valSub == ""){
				//var value = valSearch.replace("_"," ");
				var value = com.ril.hn.emrpatient.util.Formatter.getFormattedWardNames(valSearch) ;
				return value ;
			}
			else{
				if(valSub.search(" ") == -1){
					if(that.i18n !== undefined){
			     		  var key = "TXT_FILTER_" + valSub ;
			     		  var text = that.i18n.getText(key);
			     		  if(text !== key)
			     			  return text ;
			     		  else 
			     			  return valSub ;
			     	   }
					//return com.ril.hn.emrpatient.util.Formatter.getI18nText(valSub);
				}else{
					return valSub;
				}
			}
				
		},
		
		getFormattedTime_hhmm : function(oValue) {

            if (oValue == undefined)
                            return "";
            var oDate;
            if (oValue instanceof Date) {
                            oDate = oValue;
            } else if (oValue.ms) {
                            var hours = (oValue.ms / (3600 * 1000)) | 0;
                            var minutes = ((oValue.ms - (hours * 3600 * 1000)) / (60 * 1000)) | 0;
                            var seconds = ((oValue.ms - (hours * 3600 * 1000) - (minutes * 60 * 1000)) / 1000) | 0;
                            oDate = new Date();
                            oDate.setHours(hours, minutes, seconds, 0);
            } else {
                            if (typeof oValue != 'string' && !(oValue instanceof String))
                                            return "";
                            if (oValue.length != 11)
                                            return "";
                            if (oValue.substring(0, 2) != "PT"
                                            || oValue.substring(4, 5) != "H"
                                                            || oValue.substring(7, 8) != "M"
                                                                            || oValue.substring(10, 11) != "S") {
                                            return "";
                            }
                            var hours = oValue.substring(2, 4) * 1;
                            var minutes = oValue.substring(5, 7) * 1;
                            var seconds = oValue.substring(8, 10) * 1;
                            oDate = new Date();
                            oDate.setHours(hours, minutes, seconds, 0);
            }

            var oDateFormat = sap.ca.ui.model.format.DateFormat
            .getTimeInstance({
                            style : "short",
                            pattern:"HH:mm"
            });
            var sTime = oDateFormat.format(oDate);
            var aTimeSegments = sTime.split(":");
            var sAmPm = "";
            var lastSeg = aTimeSegments[aTimeSegments.length - 1];

            if (isNaN(lastSeg)) {
                            var aAmPm = lastSeg.split(" ");
                            aTimeSegments[aTimeSegments.length - 1] = aAmPm[0];
                            sAmPm = " " + aAmPm[1];
            }
            return (aTimeSegments[0] + ":" + aTimeSegments[1] + sAmPm);
		},
		
		getFormattedDateAndTime : function(dateTimeVal){
			return com.ril.hn.emrpatient.util.Formatter.getFormattedDate(dateTimeVal) + " " + com.ril.hn.emrpatient.util.Formatter.getFormattedTime_hhmm(dateTimeVal);
		},
		
		getFormattedDateAndTime_Other : function (oDate){
			//var date = new Date (oDate);
			if (oDate == undefined)
				return "";
			var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
				pattern : "dd.MM.YYYY HH:mm"
			});
			return oDateFormat.format(oDate);
		},
		
		isPrimaryDiagnosis : function(primaryDiagnosis){
			if(primaryDiagnosis)
				return "(Primary)";
			else
				return  "" ;
		},
		
		isPrivateInsured : function (privateInsured){
			if(privateInsured)
				return "Private";
			else
				return  "" ;
		},
		
		timeValue : function(value)
		{  //not used
			if(value)
			{
				var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({pattern: "KK:mm:Ss a"});  
				var TZOffsetMs = new Date(O).getTimezoneOffset()*60*1000;  
				var timeStr = timeFormat.format(new Date(value.ms + TZOffsetMs));
				return timeStr;
			}else{
				return value;
			}
			
		},
		
		getClinicalOrderStatus : function(status){
		 switch(status){
						   case "saved" : return "Error";
						   			 	  break;
		   case "financially confirmed" : return "Warning";
		   								  break;
						case "released" : return "Success";
				 			 			  break;
		   }
		},
		
		getClinicalTaskStatus : function(status){
			 switch(status){
  					    case "OPEN" : return "Warning";
					 				  break;
				   case "COMPLETED" : return "Success";
			   			 			  break;
			   
			   }
			},

	   getDocumentsStatus : function(status){
			 switch(status){
			   case "In Work" : return "Warning";
			   			 		break;
			   case "Release" : return "Success";
	   			 				break;
			   }
			},
			
	    getImagesStatus : function(status){
			 switch(status){
			   case "STATUS" : return "Error";
			   			 	   break;
			   
			   }
			},

       getWardName : function(ward){
    	   /*if(ward !== "" && ward !== undefined){
    		   var wardName = ward.replace("T" , " Tower ");
    		   wardName =  wardName.replace("N" ,  " Floor North Wing ");
    		   wardName =  wardName.replace("S" ,  " Floor South Wing ");
    		   return wardName;
    	   }
    	   else 
    		   return ward ;
    	   */
    	   if(that.i18n !== undefined){
    		  var key = "TXT_WARD_" + ward ;
    		  var wardName = that.i18n.getText(key);
    		  if(wardName !== key)
    			  return wardName ;
    		  else 
    			  return ward ;
    	   }
    	  return "";
    	   
       },
       
       getI18nText  : function(code){
    	//Universal formatter for getting texts for key
    	   if(that.i18n !== undefined){
     		  var key = "TXT_CODE_" + code ;
     		  var text = that.i18n.getText(key);
     		  if(text !== key)
     			  return text ;
     		  else 
     			  return code ;
     	   }
       },
       
       trimExtPatientId : function(ext){
    	   return parseInt(ext);
       },
       
       getChartValue : function(value){
    	   if(value == null || value == " "  ||  value.length == 0)
    		   return 0 ;
    	   else 
    		   return parseInt(value);
       },
       
       isLocation : function(value){
    	   if(value == null || value == " "  ||  value.length == 0)
    		   return false ;
    	   else 
    		   return true;
       },
       
       //Used for master title in Patient Overview apps
       getFormattedWardNames : function(value){
    	   if(value == "patients_by_ward"){
    			return "Ward";
    		}else if(value == "my_patients"){
    			return "My Patients";
    		}else if(value == "my_favorites"){
    			return "My Favorites";
    		}else if(value == "my_appointments"){
    			return "My Appointments";
    		}
       },
       
       getFooterToolbarVisibility :  function(isPhone , isTablet){
	       if(isPhone || isTablet)
		    	return true;
		    else
		    	return false;
		},
		
		 getDataIndicatorVisibility : function (length){
	    	  return (length == 0) ? false : true ;
	       },
	       
	       getConcatenatedDateAndTime : function(date,time){
				var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
					pattern : "dd.MM.YYYY"
				});
				if(time)
					return  oDateFormat.format(date) + " " + time.substr(0,5) ; 
				else
					return  oDateFormat.format(date);
			},
			
			getFormattedDateForAdhoc : function(dateTime){
				var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
					pattern : "YYYY/MM/dd"
				});
				return  oDateFormat.format(dateTime);
			},
			
			getFormattedTimeForAdhoc : function(dateTime){
				var oTimeFormat = sap.ca.ui.model.format.DateFormat.getInstance({
					pattern : "HH:mm:ss"
				});
				return  oTimeFormat.format(dateTime);
			} ,
			
			 getProgressNoteCreatorStatus : function(creator){
		    	   if(creator == "Nursing"){
		               return "None";
			        }else{
			           return "Warning";
			        }

		       },
		       
		       getLabResultValueStatus : function(value){
					switch(value){
						case "H" : return "Error"; break ;
						case "L" : return "Error"; break ;
						case "" : return "None" ; break ;
					}
				},
				
			getFormattedTime : function(time){
					if (time == undefined)
                        return "";
			        var hours , minutes  ;
			        if (time instanceof Date) {
			              var oDate = time;
			              hours = oDate.getHours();
			              minutes = oDate.getMinutes();
			        } else if (time.ms) {
			              hours = (time.ms / (3600 * 1000)) | 0;
			              minutes = ((time.ms - (hours * 3600 * 1000)) / (60 * 1000)) | 0;
			              } else {
			              if (typeof time != 'string' && !(time instanceof String))
			                     return "";
			              if (time.length != 11)
			                     return "";
			              if (time.substring(0, 2) != "PT" || time.substring(4, 5) != "H"
			                  || time.substring(7, 8) != "M" || time.substring(10, 11) != "S") {
			                     return "";
			              }
			              hours = time.substring(2, 4) * 1;
			              minutes = time.substring(5, 7) * 1;
			              
			      }
			        hours = (hours < 10) ? ("0" + hours) : hours ;
			        minutes = (minutes < 10) ? ("0" + minutes) : minutes ;
			        return hours + ":" + minutes ;
				},
				
				getFormattedDateTimeForDietary : function(date,time){
					var d = com.ril.hn.emrpatient.util.Formatter.getFormattedDate(date);
					var t = com.ril.hn.emrpatient.util.Formatter.getFormattedTime(time);
					return d + " " + t  ;
				},
				
				getDocumentsApproveVisibility : function(status){
					if(status == "In Work") 
						return true;
					else
						return false;
				},
				
				getScoreChartsDateTime : function(oDate){
					if(oDate == null){
						oDate= new Date();
					}
					var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
						pattern : "YYYY-MM-dd"
					});
					return  oDateFormat.format(oDate) + "T00:00:00";  
				},
				
				getScoreChartFormattedDateTime : function(date,time){
					var d = date;
					var t = com.ril.hn.emrpatient.util.Formatter.getFormattedTime(time);
					return d + " " + t  ;
				},
		       
				getMedicationFormattedDate : function(oDate){
					if (oDate == undefined)
						return "";
					var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
						pattern : "YYYYMMdd"
					});
					return oDateFormat.format(oDate);
				},
				
				getCaseDaysCount : function(startDate,endDate){
					if( typeof startDate == "string")
						startDate = new Date(startDate);
					if( typeof endDate ==  "string")
						endDate = new Date(endDate);
					var timeDiff = Math.abs(startDate.getTime() - endDate.getTime());
					var daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24 ));
					daysDiff = parseInt(daysDiff) ;
					return daysDiff;
				},
				
				getMedicationFormattedDateForHeader :  function(oDate){
					if (oDate == undefined)
						return "";
					var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
						pattern : "MM-dd-YYYY"
					});
					return oDateFormat.format(oDate);
				},
				
				getFormattedDocumentName : function(shortText,title){
					if(shortText)
						return title + " - " + shortText;
					else
						return title;
				},
				
				getFavouriteIconName : function(value){
					if(value !== "")
						return "sap-icon://favorite";
					else
						return "sap-icon://unfavorite";
				},
				
				getFavouriteIconColor : function(value){
					if(value !== "")
						return "#ffcc00";  //#ffcc00 yellow , #a366ff purple
					else
						return "#999999";
				},
				
				getFormattedDateAndTimeOffest : function (oDate){
					if (oDate == undefined || oDate =="")
						return "No value";
					if(oDate.getTime() == undefined)
						oDate = new Date(oDate);
					var oDate = new Date(oDate.getTime() - (5*60*60*1000) -(30*60*1000));
					var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
						pattern : "dd.MM.YYYY HH:mm"
					});
					
					return oDateFormat.format(oDate);
				},
       
				//medication new functionality
				/*dateFormate : function(oValue) {
					if (oValue != null && isNaN(oValue) && oValue.startsWith("/Date")) {
						oValue = new Date(parseInt(oValue.split("(")[1].split(")")[0]));
					}
					if (oValue) {
						var oDateFormat = sap.ui.core.format.DateFormat
								.getDateTimeInstance({
									pattern : "dd.MM.yyyy"
								});
						return oDateFormat.format(new Date(oValue));
					} else {
						return null;
					}
				},*/
				getMedIconVisible : function(oVisible){
					if(oVisible){
						return true;
					} else {
						return false;
					}
				},
				
				getMedStatusColor : function(oStatus){
					if(oStatus == "STAT"){
						return "Warning";
					} else {
						return "None";
					}
				},
				
				getIOCategoryDescription : function(oValue) {
					if (oValue == "1") {
						return "Intake";
					} else if (oValue == "2"){
						return "Output";
					}
				},
				
				getIOCategoryStatus : function(oValue) {
					if (oValue == "1") {
						return "Success";
					} else if (oValue == "2"){
						return "Warning";
					}
				},
				
				getIOFromTODateTimeSplit : function(oString){
					var dateTime = oString.split(" ")[2]+" "+oString.split(" ")[3];
					return dateTime;
				},
				
				getIOFromDateTimeSplit : function(oString){
					var fromDateTime=oString.split(" ")[2]+" "+oString.split(" ")[3];
					return fromDateTime;
				},
				
				/* set the event link to date in detail page */ 
				getIOToDateTimeSplit : function(oString){
					var toDateTime=oString.split(" ")[5]+" "+oString.split(" ")[6];
					return toDateTime;
				},
				
				toFromDateFormat : function(oDate){
					var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
						pattern : "dd.MM.YYYY"
					});
					var value = oDateFormat.format(oDate);
					var finalValue = value.split(".")[2]+"-"+value.split(".")[1]+"-"+value.split(".")[0]+"T00:00:00";
					return finalValue;
				},
				
				/* to get time format for odata call in Detail page */
				toFromTimeFormat : function(oDate){
					var value = oDate.toTimeString();
					var valueX = value.split(" ")[0];
					var finalValue = "PT"+valueX.split(":")[0]+"H"+valueX.split(":")[1]+"M"+valueX.split(":")[2]+"S";
					return finalValue;
				},
				
				getFormattedComments : function(co,pco){
					var res = "";
					if(co) 
						res = "- " + co +"\n";
					if(pco)
						res = res + "- " + pco ;
					return res;
				},
				
				
				getLRHHMMTimestamp : function(type,data){
					for(var k = 0 ; k < data.length ; k++){
						data[k][type].setSeconds(0);
						data[k][type].setMilliseconds(0);
					}
					return data;
				},
				
				getIOVolumeText : function(oValue){
					var totalIntakeQuantity = 0 ,totalOuttakeQuantity = 0;
			        var text1 = "Intake Total: ";
			        var text2 = "Output Total: ";
			        var text3 = "Total Difference: ";
			        for(var i=0;i<oValue.length;i++){
			              if(oValue[i].Category == "1"){//intake
			              var intakeValue = oValue[i].Value;
			                if(oValue[i].Unit == "LTR" || oValue[i].Unit == "L"){
			                     intakeValue = intakeValue * 1000;
			                } else if(oValue[i].Unit == "F"){
			                     intakeValue = 0;
			                }
			                totalIntakeQuantity = parseFloat(totalIntakeQuantity) + parseFloat(intakeValue);
			             }else{//outTake
			              var outputValue = oValue[i].Value;
			                if(oValue[i].Unit == "LTR" || oValue[i].Unit == "L"){
			                     outputValue = outputValue * 1000;
			                } else if(oValue[i].Unit == "F"){
			                     outputValue = 0;
			                }
			                totalOuttakeQuantity = parseFloat(totalOuttakeQuantity) + parseFloat(outputValue);
			           }
			        }
			        var diff = parseFloat(totalIntakeQuantity) - parseFloat(totalOuttakeQuantity);
			        concateString = text1 + totalIntakeQuantity +" Ml, "+ text2 + totalOuttakeQuantity +" Ml, "+ text3 + diff +" Ml";
			        return concateString; 
				},

				getPatientBed : function(oValue){
					if(oValue)
						return oValue.split(" ")[3];
					else
						return "";
				},
				
				getPatientDepartment : function(oValue){
					var dept = "";
					if(oValue)
						dept = oValue.split(" ")[0];
					else
						dept = "";
					if(that.i18n !== undefined){
			    		  var key = "TXT_CODE_" + dept ;
			    		  var deptName = that.i18n.getText(key);
			    		  if(deptName !== key)
			    			  return deptName ;
			    		  else 
			    			  return dept ;
			    	   }
			    	  return "";
				},
				
				getDocumentDetails : function(oValue){
					if(oValue){
						var docno = parseInt(oValue.substr(3,25));
						var version = oValue.substr(28,2);
						return docno + "(" + version + ")";
					}else{
						return "";
					}
				},
				
				getDocumentsShortStatus : function(status){
					switch(status){
					   case "IW" : return "In Work";
					   			 		break;
					   case "RL" : return "Release";
			   			 				break;
					   default : return "";
					   					break;
					   }
				},
				
				getChartFloatValue : function(value){
			    	   if(value == null || value == " "  ||  value.length == 0)
			    		   return 0 ;
			    	   else 
			    		   return parseFloat(value);
			       },
			       
			   getAdhocParentDesc : function(value){
				   if(value){
					   var arr = [];
					   if(that.oAdhocGroupsList)
						   arr = that.oAdhocGroupsList.getData().AdhocGroupsListData;
					  /* else if(that.oAdhocGroupsList)
						   arr = that.oAdhocGroupsList.getData().AdhocGroupsListData;*/
					   var grp ="";
					   $.each(arr , function(index,item) { 
						   if(value == item.ParentNode){
							   grp =  item.Service_Desc;
							   return;
						   }
					  });
					   return grp ;
				   }else{
					   return "";
				   }
			   },
			   
			   getFormattedDate_YYYY_MM_dd :  function(oDate){
					if (oDate == undefined)
						return "";
					var oDateFormat = sap.ca.ui.model.format.DateFormat.getInstance({
						pattern : "YYYY-MM-dd"
					});
					return oDateFormat.format(oDate);
				},
				
				getDocDepartmentText : function(oValue){
					if(oValue) 
						return com.ril.hn.emrpatient.util.Formatter.getI18nText(oValue);
					else
						return "All";
				},
				
				getAllergyStatusCode : function(oValue){
					if(oValue){
				    	switch(oValue){
				    		case "Allergies Exist" : return "@AG\\Q"+ oValue+"@";
				    		case "No Known Allergies" : return "@B1\\Q"+ oValue+"@";
				    		case "Assessment Not Possible" : return "@B0\\Q"+ oValue+"@";
				    		default : return "";
				    	}
				    }else
				    	return "";
				},
				
				getFormattedAdmissionDate : function(oDate){
					if(typeof oDate == "object")
						oDate = new Date(oDate.getTime() - (5 * 60 * 60 * 1000) - (30 * 60 * 1000));
					else if (typeof oDate == "string" && oDate.startsWith("/Date("))
						oDate = new Date(parseInt(oDate.split("/Date(")[1].split(")/")[0])- (5 * 60 * 60 * 1000) - (30 * 60 * 1000));
					return oDate;
				},
				
				getIPOPBedHeaderText : function(oValue){
					switch(oValue){
					case "IP" : return that.i18n.getText("LBL_PATIENT_DOA") ;
					case "OP" : return that.i18n.getText("LBL_PATIENT_DOAPP");
					default : return that.i18n.getText("LBL_PATIENT_DOA");
					}
				},
				
				getFormattedUnit : function(oValue){
					if (oValue){
	                     if(oValue == "MLT" || oValue == "ML"){
	                           return "Millilitre";
	                     } else if(oValue == "LTR" || oValue == "L") {
	                           return "Litre";
	                     } else if(oValue == "F") {
	                           return "Frequency";
	                     } else {
	                           return oValue;
	                     }                    
	              }  
				},
			   
				
	}
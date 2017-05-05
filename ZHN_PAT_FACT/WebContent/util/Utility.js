jQuery.sap.declare("com.ril.hn.emrpatient.util.Utility");

com.ril.hn.emrpatient.util.Utility = {
		
		//Cretae an empty dialog 
		onDialogCreate : function(oContext,sType,sName){ //sType=fragment name , sName=variable name 
			if (!oContext[sName]) {
				try{
					oContext[sName] = sap.ui.xmlfragment("com.ril.hn.emrpatient."+sType,oContext);
					oContext.getView().addDependent(oContext[sName]);
				}catch(oError){
					this.displayError("This fragment objet already exist.","ERROR","Alert");
				}
	        }
			return oContext[sName];
		},
		
		onDialogOpen : function(oContext,sType,sName){
			if(oContext[sName]){
				oContext[sName].open();
			}else{
				this.onDialogCreate(oContext,sType,sName);
				this.onDialogOpen(oContext, sType, sName);
			}
			return oContext[sName];
		},
		
		onDialogClose : function(oContext,sName){
			if(oContext[sName]){
				oContext[sName].close();
			}
		},
		
		onPopoverOpen : function(oContext,sType,sName,oSource){
			if(oContext[sName]){
				oContext[sName].openBy(oSource);
			}else{
				this.onDialogCreate(oContext,sType,sName);
				oContext[sName].openBy(oSource);
			}
			return oContext[sName];
		},
		
		displayError  : function(oError,sType,sTitle){
			   var msg = "";
			   if(oError.response){
				   msg = JSON.parse(oError.response.body);
			       msg = msg.error.message.value;
			   }else if(oError.message)
				   msg = oError.message;
			   else 
				   msg = oError;
			   sap.m.MessageBox.show(msg, {
			           title: sTitle,
			           icon: sap.m.MessageBox.Icon[sType],
			           actions: [sap.m.MessageBox.Action.OK],
		       });
		   },
		   
		//find unique json objects from an array depending on a property
		getUniqueValues : function(aItems,sProperty){
			var aResult = [];
			aResult.push(aItems[0]);
			$.each(aItems,function(index,item){
				var isUnique = true;
				$.each(aResult,function(indexU,itemU){
					if(item[sProperty]==itemU[sProperty]){
						isUnique = false;
						return false;
					}
				});	
				if(isUnique)
					aResult.push(item);
			});
		},
		
		//get date time according to format passed
		/* allowed formats : dd.MM.yyyy , dd MMM yyyy , dd.MM.yyyy HH:mm , dd.MM.yyyy HH:mm:ss , dd.MM.yyyyTHH:mm:ss ,
		 *  				 PTHH'H'mm'M'ss'S'('escape character required in between patterns if text is to be diisplayed') , etc.
		 * Note : refer http://cldr.unicode.org/translation/date-time-patterns for date time patterns
		 */
		getDisplayDateTime : function(oDate,oTime,format){
			var oDt = oTm = null , hr = min = sec = "" ;
			if(oDate){
				if(typeof oDate == "string")
					oDt = new Date(oDate);  //allowed date format : yyyy.MM.dd , yyyy-MM-dd , yyyy/MM/dd ,  yyyy-MM-ddTHH:mm:ss
				else
					oDt = oDate;
			}else{
				oDt = new Date();
			}
			if(oTime){
				if(typeof oTime == "object"){
					if(oTime.ms){
							 hr = (oTime.ms / (3600 * 1000)) | 0;
		                     min = ((oTime.ms - (hr * 3600 * 1000)) / (60 * 1000)) | 0;
		                     sec = ((oTime.ms - (hr * 3600 * 1000) - (min * 60 * 1000)) / 1000) | 0;
		                     oDt.setHours(hr,min,sec,0);
						}
					}else if(typeof oTime == "string"){
						if(oTime.length == 11 && oTime.substring(0, 2) == "PT"
		                    || oTime.substring(4, 5) == "H"
		                        || oTime.substring(7, 8) == "M"
		                                        || oTime.substring(10, 11) == "S"){
							hr = oTime.substring(2, 4) * 1;
		                    min = oTime.substring(5, 7) * 1;
		                    sec = oTime.substring(8, 10) * 1;
		                    oDt.setHours(hr,min,sec,0);
						}
				}
			}
			var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({pattern: format});
			return oDateFormat.format(oDt);	
		},
		
		onSortItems : function(oContext,sId,oEvent){
			  var oTable = oContext.getView().byId(sId);
	          var mParams = oEvent.getParameters();
	          var oBinding = oTable.getBinding("items");
	          var aSorters = [];
	          var sPath  = mParams.sortItem.getKey();
	          var bDescending = mParams.sortDescending;       
	          aSorters.push( new sap.ui.model.Sorter(sPath,bDescending));
	          if(oTable.getItems().length!=0){
	                 oBinding.sort(aSorters);
	          }
		},
		
		onFilterItems : function(oContext,sId,aFilter){
			var oBinding = oContext.getView().byId(sId).getBinding("items");
	        oBinding.filter(aFilter);	
		},
		
		onBusyIndicatorOpen : function(oContext){
			if( oContext["BusyIndicator"] == undefined ){
				oContext["BusyIndicator"] = new sap.m.BusyDialog({
				});
			}
			oContext["BusyIndicator"].open();
		},
		
		onBusyIndicatorClose : function(oContext){
			if( oContext["BusyIndicator"]){
				oContext["BusyIndicator"].close();
			}
		},
		
		onValueHelpOpen : function(oContext,sName,sTitle,sPath,oItem,onSearchCallback,onCloseCallback){
			if( oContext[sName] == undefined ){
				oContext[sName] = new sap.m.SelectDialog({
		                        title : sTitle ,
		                        noDataText : that.i18n.getText("TXT_NO_ENTRIES_FOUND") ,
		                        items : {
		                               path : sPath ,
		                               template : new sap.m.StandardListItem({
		                                      title : oItem.Title ,
		                                      description : oItem.Description ,
		                               })          
		                        },
		                        liveChange : [
		                                      onSearchCallback,
		                                      oContext ],
		                        confirm : [
		                                      onCloseCallback,
		                                      oContext ],
		                        cancel : [
		                                      onCloseCallback,
		                                      oContext ]
		                 });
			}
			oContext[sName].open();
			return oContext[sName];
		},
		
		onValueHelpClose : function(oContext,sName){
			if( oContext[sName]){
				oContext[sName].close();
			}
		},
		
		onDestroyFragment : function(oContext,sName){
			if (oContext[sName]) {
				oContext[sName].destroy();
				oContext[sName] = undefined;
	        }
		},
		
		onTableCollapse : function(oEvent){
			var oTable = null ;
			if(oEvent.getSource().getCustomData().length > 0 && oEvent.getSource().getCustomData()[0].getValue() == "ProgressNotes"){
				oTable = oEvent.getSource().getParent().getParent().getContent()[1] ;
			}else{
				oTable = oEvent.getSource().getParent().getParent() ;
			}
			oTable._oGrowingDelegate._iItemCount = 3;
			oTable._oGrowingDelegate._iRenderedDataItems = 3;
			oTable.updateItems();
			oTable._oGrowingDelegate._iRenderedDataItems = 3;
			oTable.updateItems();
		},
		
		onTableCollapseFooter : function(oEvent){
			var panel = oEvent.getSource().getParent().getParent() ;
			var oTable = null ;
			if(oEvent.getSource().getCustomData().length > 0 && oEvent.getSource().getCustomData()[0].getValue() == "ProgressNotes"){
				oTable = panel.getContent()[1] ;
			}else{
				oTable = panel.getContent()[0] ;
			}
			oTable._oGrowingDelegate._iItemCount = 3;
			oTable._oGrowingDelegate._iRenderedDataItems = 3;
			oTable.updateItems();
			oTable._oGrowingDelegate._iRenderedDataItems = 3;
			oTable.updateItems();
		},
		
		handlePanelManualExpandCollapse : function(oEvent){
			var panel = oEvent.getSource().getParent();
			var expand = (panel.getExpanded() == true) ? false : true ;
			panel.setExpanded(expand);
		},
		
		handlePanelManualExpandCollapseFooter : function(oEvent){
			var panel = oEvent.getSource().getParent().getParent();
			var expand = (panel.getExpanded() == true) ? false : true ;
			panel.setExpanded(expand);
		},
		
		openFioriAppInDialog : function(oContext,srcPath,sTitle){
			var iwidth = "100%";
 			var iheight = "800px";
 			var content = new sap.ui.core.HTML({
 			    preferDOM : true,
 				content : "<iframe class='" + "iframeclass"	+ "'" + "src='" + srcPath + "'"	+ 'style="width:' + iwidth
				+ ';height:' + iheight + ';  border: none; "' + "></iframe>"
 			});
 			var dialog = this.onDialogOpen(oContext,"fragment.FioriApp", "FioriApp");
 			dialog.setTitle(sTitle);
 			sap.ui.getCore().byId("idIframeContent").removeAllContent();
 			sap.ui.getCore().byId("idIframeContent").addContent(content);
		}
		
		
		
};
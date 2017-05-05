jQuery.sap.declare("com.ril.hn.emrpatient.util.UiControlManager");

com.ril.hn.emrpatient.util.UiControlManager = {
		
		initTableControl : function(oContext,oTable,oTemplate,oModel,sBPath){
			/*if(!oTable.getAggregation("items") || oTable.getMode()==="MultiSelect"){
		        oTable.unbindAggregation("items");
		        oTable.setModel(oModel);
		        oModel.setSizeLimit(oModel.getData()[sBPath].length);
		        oTable.bindAggregation("items","/"+sBPath,oTemplate);
		    }else{
		    	oTable.setModel(oModel);
		    	oModel.setSizeLimit(oModel.getData()[sBPath].length);
		    	oModel.refresh(true);
			 }*/
			 oTable.unbindAggregation("items");
		        oTable.setModel(oModel);
		        oModel.setSizeLimit(oModel.getData()[sBPath].length);
		        oTable.bindAggregation("items","/"+sBPath,oTemplate);
		},
		
		initChartsControl : function(oContext,oFrame,oPopDisplay,oDimension,oMeasure,sTitle,sBPath){
			var colorPalette = ['#FFFFFF','#27A3DD','#759422'];
			if(sTitle==="Height and Weight")
				colorPalette = [ '#27A3DD', '#759422'];
			var oDataset = new sap.viz.ui5.data.FlattenedDataset(
					{  dimensions : oDimension ,
						measures : oMeasure ,
						data : {
							path : "/"+sBPath
						}
					});
			oFrame.setDataset(oDataset);
			oFrame.setVizProperties({
							valueAxis : {
								label : {
									formatString : 'u'
								},
								title : {
									visible : false,
									
								}
							},
							categoryAxis : {
								label : {
									formatString : 'u'
								},
								title : {
									visible : false,
									
								}
							},
							legend : {
								title : {
									visible : false
								},
							  visible :  true
							},
							xAxis : {
								isIndependentMode : true,
		
								gridline : {
									visible : true,
									showFirstLine : true,
									showLastLine : true,
									type : sap.viz.ui5.types.Axis_gridline_type.line
								},
								title : {
									visible : true,
									text : sTitle
								}
							},
							yAxis : {
								isIndependentMode : false,
								gridline : {
									visible : true,
									showFirstLine : true,
									showLastLine : true,
									type : sap.viz.ui5.types.Axis_gridline_type.line
								},
		
								scale : {
									fixedRange : true,
								}
							},
							plotArea : {
									dataLabel : {
										visible : true
									},
								    colorPalette :
								    	colorPalette
								},
			
								title : {
									visible : true,
									text : sTitle
								}
		
						});
            var aValues = [];
            $.each(oMeasure , function(i,item){
            	aValues.push(item.name);
            });
			var feedValueAxis = new sap.viz.ui5.controls.common.feeds.FeedItem(
			{
				'uid' : "valueAxis",
				'type' : "Measure",
				'values' : aValues
			});
			aValues = [];
			$.each(oDimension , function(i,item){
	            	aValues.push(item.name);
	            });
			var feedCategoryAxis = new sap.viz.ui5.controls.common.feeds.FeedItem(
			{
				'uid' : "categoryAxis",
				'type' : "Dimension",
				'values' : aValues
			});
			oFrame.addFeed(feedValueAxis);
			oFrame.addFeed(feedCategoryAxis);
			oPopDisplay.connect(oFrame.getVizUid());
		},
		
};
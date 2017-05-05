sap.ui.controller("com.ril.hn.emrpatient.controller.Main", {

    onInit : function() {
        if (sap.ui.Device.support.touch === false) {
            this.getView().addStyleClass("sapUiSizeCompact");
        }
    }
});

sap.ui.define([
    "sap/ui/core/UIComponent",
    "sfsalesdemoapp/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("sfsalesdemoapp.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();

            // Force navigation to MainView on startup if no hash is set
            if (!window.location.hash || window.location.hash === "#") {
                this.getRouter().navTo("RouteMainView", {}, true);
            }

            //Shared var
            var oSharedModel = new sap.ui.model.json.JSONModel({
                SelectedTable: "",
                SelectedTableID: "",
                SavedTableData: [],
                MaxNumHits: 0,
                SelectedTableSummary: ""
            });
            this.setModel(oSharedModel, "shared");

            var oSavedSearched = new sap.ui.model.json.JSONModel({
                SavedSearchesObjects: []
            });
            this.setModel(oSavedSearched, "SavedSearches")
        }
    });
});
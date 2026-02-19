sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Filter, FilterOperator) {
    "use strict";

    return {

        // Filter the list based on the input
        onSearchTables: function (oEvent) {
            var sValue = oEvent.getParameter("value");

            if (!this._oDialog) return; // safety check

            var oList = this._oDialog.getContent().find(function (c) {
                return c.isA("sap.m.List");
            });

            if (!oList) return;
            var oBinding = oList.getBinding("items");

            if (!sValue) {
                oBinding.filter([]); // clear filter
                return;
            }

            var aFilters = [
                new Filter("id", FilterOperator.Contains, sValue.toUpperCase()),
                new Filter("name", FilterOperator.Contains, sValue)
            ];

            var oCombinedFilter = new Filter({ filters: aFilters, and: false });
            oBinding.filter([oCombinedFilter]);
        },

        // Open the dialog
        openTableSearchPopup: function (oController) {
            var sValue = oController.getView().byId("TableSearchInputBox").getValue();

            if (!this._oDialog) {
                this._oDialog = new sap.m.Dialog({
                    title: "Table Search Helper",
                    content: [
                        new sap.m.Input({
                            placeholder: "Type something...",
                            value: sValue,
                            liveChange: this.onSearchTables.bind(this)
                        }),

                        new sap.m.List({
                            mode: "SingleSelectMaster",
                            items: {
                                path: "entitySets>/entitySets",
                                template: new sap.m.StandardListItem({
                                    title: "{entitySets>id}",
                                    description: "{entitySets>name}"
                                })
                            },
                            selectionChange: function (oEvent) {
                                console.log("Item clicked!");
                                var oItem = oEvent.getParameter("listItem");
                                var sID = oItem.getTitle();
                                var sName = oItem.getDescription();

                                // Update your page inputs
                                var oView = oController.getView();
                                oView.byId("TableSearchInputBox").setValue(sID);
                                oView.byId("TextTableInputBox").setValue(sName);

                                var oModel = oController.getView().getModel();
                                var oMetaModel = oModel.getMetaModel();
                                var oEntitySet = oMetaModel.getODataEntitySet(sName);

                                var oLabelExtension = oEntitySet.extensions?.find(function (ext) {
                                    return ext.name === "label";
                                });

                                var sLabel = oLabelExtension ? oLabelExtension.value : "";

                                oView.byId("TableSummary").setText(sLabel);

                                //Save selected table
                                oController.getOwnerComponent().getModel("shared").setProperty("/SelectedTable", sName);
                                oController.getOwnerComponent().getModel("shared").setProperty("/SelectedTableSummary", sLabel);

                                // Close dialog
                                this._oDialog.close();

                                //Load field Names
                                oController.loadSelectedTableFields(sName);
                            }.bind(this)
                        })
                    ],
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () {
                            this._oDialog.close();
                        }.bind(this)
                    }),
                    afterClose: function () {
                        this._oDialog.destroy();
                        this._oDialog = null;
                    }.bind(this)
                });

                oController.getView().addDependent(this._oDialog);
            }

            this._oDialog.open();

            // Trigger initial search if input is not empty
            if (sValue && sValue.trim() !== "") {
                this.onSearchTables({
                    getParameter: function () { return sValue; } // fake event object
                });
            }
        }
    };
});

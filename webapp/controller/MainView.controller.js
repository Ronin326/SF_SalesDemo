sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sfsalesdemoapp/model/formatter",
    "sfsalesdemoapp/model/dialog"
], function (Controller, JSONModel, formatter, dialog) {
    "use strict";

    return Controller.extend("sfsalesdemoapp.controller.MainView", {
        formatter: formatter,
        dialog: dialog,

        onInit: function () {
            var oModel = this.getOwnerComponent().getModel();
            var oMetaModel = oModel.getMetaModel();
            var that = this;

            oMetaModel.loaded().then(function () {
                var oDataService = oMetaModel.getODataEntityContainer();

                // Build entity sets with unique IDs
                var aEntitySets = oDataService.entitySet.map(function (es, index) {
                    var caps = es.name.match(/[A-Z]/g) || [];
                    var capStr = caps.join("");
                    var num = (index + 1).toString().padStart(5, "0");
                    return {
                        name: es.name,
                        id: capStr + "_" + num
                    };
                });

                var oEntitySetModel = new JSONModel({ entitySets: aEntitySets });
                that.getView().setModel(oEntitySetModel, "entitySets");

            });
        },

        // Call this to open the Table Search Helper
        onOpenTableSearchHelper: function () {
            this.dialog.openTableSearchPopup(this);
        },

        loadSelectedTableFields: function (sEntitySetName) {
            var oModel = this.getOwnerComponent().getModel();
            var oMetaModel = oModel.getMetaModel();
            var that = this;

            oMetaModel.loaded().then(function () {
                // Adjust namespace if needed
                var sEntityTypeName = "SFOData." + sEntitySetName;

                var oEntityType = oMetaModel.getODataEntityType(sEntityTypeName);
                if (!oEntityType) {
                    console.warn("Entity type not found:", sEntityTypeName);
                    return;
                }

                var aFields = oEntityType.property.map(function (p) {
                    return {
                        fieldName: p.name,
                        label: p["sap:label"] || p.name
                    };
                });

                var oFieldModel = new sap.ui.model.json.JSONModel({
                    fields: aFields
                });

                that.getView().setModel(oFieldModel, "fields");
            });
        },

        //Nav to Data Table
        onGoToDisplayTable: function () {
            //Save Search Table Vars
            this.getOwnerComponent().getModel("shared").setProperty("/SelectedTable", this.byId("TextTableInputBox").getValue());
            this.getOwnerComponent().getModel("shared").setProperty("/SelectedTableID", this.byId("TableSearchInputBox").getValue());
            this.onSaveTableData();
            this.getOwnerComponent().getModel("shared").setProperty("/MaxNumHits", parseInt(this.byId("MaxNoHitsInputBox").getValue(), 10));

            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteDisplayTable", {}, true , {clearTarget: true});
        },

        onSaveTableData: function() {
            // Get the table
            var oTable = this.byId("FieldsTable");
            var oSharedModel = this.getOwnerComponent().getModel("shared");

            // Array to hold row data
            var aSavedData = [];

            // Loop through the rows
            oTable.getItems().forEach(function(oRow) {
                var aCells = oRow.getCells();
                var oRowData = {
                    FieldNameText: aCells[0].getText(),
                    FromValue: aCells[1].getValue(),
                    ToValue: aCells[2].getValue(),
                    Output: aCells[3].getSelected(),
                    FieldName: aCells[4].getText()
                };
                aSavedData.push(oRowData);
            });

            // Save into shared model
            oSharedModel.setProperty("/SavedTableData", aSavedData);
        },

        // Select All CheckBoxes
        selectAll: function() {
            var oTable = this.byId("FieldsTable");
            var aItems = oTable.getItems();

            aItems.forEach(function(oItem) {
                var oCheckBox = oItem.getCells()[3];
                if (oCheckBox instanceof sap.m.CheckBox) {
                    oCheckBox.setSelected(true);
                }
            });
        },

        // Deselect All CheckBoxes
        deselectAll: function() {
            var oTable = this.byId("FieldsTable");
            var aItems = oTable.getItems();

            aItems.forEach(function(oItem) {
                var oCheckBox = oItem.getCells()[3];
                if (oCheckBox instanceof sap.m.CheckBox) {
                    oCheckBox.setSelected(false);
                }
            });
        },

        ClearAllEntries: function(){
            var oTable = this.byId("FieldsTable");
            var aItems = oTable.getItems();

            aItems.forEach(function(oItem) {
                var oFRValueField = oItem.getCells()[1];
                var oTOValueField = oItem.getCells()[2];
                if (oFRValueField instanceof sap.m.Input) {
                    oFRValueField.setValue("");
                }
                if (oTOValueField instanceof sap.m.Input) {
                    oTOValueField.setValue("");
                }
            });
        },

        //Show number of entities
        showNumEntitiesDialog: function () {

            var sSelectedTable = this.getOwnerComponent()
                .getModel("shared")
                .getProperty("/SelectedTable");

            if (!sSelectedTable) {
                sap.m.MessageToast.show("No table selected!");
                return;
            }

            var oODataModel = this.getView().getModel();

            // Create Text control so we can update it later
            var oText = new sap.m.Text({
                text: "Loading..."
            });

            // Create dialog immediately
            var oDialog = new sap.m.Dialog({
                title: "Number of Entities",
                content: [
                    new sap.m.VBox({
                        width: "100%",
                        justifyContent: "Center",
                        items: [oText]
                    })
                ],
                beginButton: new sap.m.Button({
                    text: "OK",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            this.getView().addDependent(oDialog);
            oDialog.open();

            // Now fetch only the count
            oODataModel.read("/" + sSelectedTable + "/$count", {
                success: function (oData) {
                    var iNumEntities = parseInt(oData, 10);
                    oText.setText("Entries: " + iNumEntities);
                },
                error: function () {
                    oText.setText("Failed to load entity count.");
                }
            });
        },

        onIncreaseWidthPress: function () {
            var oFieldTable = this.byId("FieldsTable");
            var sCurrentWidth = oFieldTable.getWidth();
            
            // Extract the number from the string
            var iWidth = parseInt(sCurrentWidth.replace("%", ""), 10);
            
            // Add 5% but don't exceed 100%
            iWidth = Math.min(iWidth + 5, 100);
            
            // Set the new width
            oFieldTable.setWidth(iWidth + "%");
        },

        onDecreaseWidthPress: function () {
            var oFieldTable = this.byId("FieldsTable");
            var sCurrentWidth = oFieldTable.getWidth();
            
            // Extract the number from the string
            var iWidth = parseInt(sCurrentWidth.replace("%", ""), 10);
            
            // Subtract 5% but don't go below 10%
            iWidth = Math.max(iWidth - 5, 10);
            
            // Set the new width
            oFieldTable.setWidth(iWidth + "%");
        },

        SaveSearchDialog: function () {
            var oInput = new sap.m.Input();
            var oTableName = this.byId("TextTableInputBox");
            var oTableId = this.byId("TableSearchInputBox");
            var oNumHits = this.byId("MaxNoHitsInputBox");

            // Get the table
            var oTable = this.byId("FieldsTable");

            //Owner Component
            var oOwnerComponent = this.getOwnerComponent()

            // Create dialog
            var oDialog = new sap.m.Dialog({
                title: "Save Search",
                type: "Standard",
                state: "Information",
                content: [
                    new sap.m.HBox({
                        width: "100%",
                        height: "100%",
                        justifyContent: "Center",
                        items: [
                            new sap.m.Text({
                                text: "Search Name :"
                            }),
                            oInput
                        ]
                    })
                ],
                beginButton: new sap.m.Button({
                    text: "Save",
                    press: function () {

                        // Array to hold row data
                        var aSavedData = [];

                        // Loop through the rows
                        oTable.getItems().forEach(function(oRow) {
                            var aCells = oRow.getCells();
                            var oRowData = {
                                FieldNameText: aCells[0].getText(),
                                FromValue: aCells[1].getValue(),
                                ToValue: aCells[2].getValue(),
                                Output: aCells[3].getSelected(),
                                FieldName: aCells[4].getText()
                            };
                            aSavedData.push(oRowData);
                        });

                        //Creat Save Object
                        var SavedSearchObject = {
                            Name: oInput.getValue(),
                            TableName: oTableName.getValue(),
                            TableId: oTableId.getValue(),
                            MaxNumHits: parseInt(oNumHits.getValue(), 10),
                            TableSummary: oOwnerComponent.getModel("shared").getProperty("/SelectedTableSummary"),
                            SavedTableData: aSavedData
                        }

                        //Add object to saved Data
                        var SavedSearches = oOwnerComponent.getModel("SavedSearches").getProperty("/SavedSearchesObjects");
                        SavedSearches.push(SavedSearchObject);
                        oOwnerComponent.getModel("SavedSearches").setProperty("/SavedSearchesObjects", SavedSearches);

                        oDialog.close();
                    }
                }),
                endButton: new sap.m.Button({
                    text: "Cancel",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function() {
                    oDialog.destroy();
                }
            });
            
            // Attach dialog to the view so the title renders properly
            this.getView().addDependent(oDialog);

            oDialog.open();
        },

        LoadSelectedSave: function() {
            var oComboBox = this.byId("SavedComboBox")

            //Get Selected Item
            var oSavedSearched = this.getOwnerComponent().getModel("SavedSearches").getProperty("/SavedSearchesObjects")

            oSavedSearched.forEach(element => {
                if (element.Name == oComboBox.getSelectedKey()){
                    //Save Search Table Vars
                    this.getOwnerComponent().getModel("shared").setProperty("/SelectedTable", element.TableName);
                    this.getOwnerComponent().getModel("shared").setProperty("/SelectedTableID", element.TableId);
                    this.getOwnerComponent().getModel("shared").setProperty("/SavedTableData", element.SavedTableData);
                    this.getOwnerComponent().getModel("shared").setProperty("/SelectedTableSummary", element.TableSummary);
                    this.getOwnerComponent().getModel("shared").setProperty("/MaxNumHits", element.MaxNumHits);

                    var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                    oRouter.navTo("RouteDisplayTable", {}, true /* replace */, {clearTarget: true});
                }
            });
        }
    });
});

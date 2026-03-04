sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sfsalesdemoapp/model/formatter",
    "sap/ui/table/Table",
    "sap/ui/table/Column",
    "sap/ui/commons/Label",
    "sap/ui/commons/TextView",
    "sap/ui/export/Spreadsheet"
], function (
    Controller,
    formatter,
    Table,
    Column,
    Label,
    TextView,
    Spreadsheet
) {
    "use strict";

    return Controller.extend("sfsalesdemoapp.controller.DisplayTable", {
        formatter: formatter,

        onInit: function () {
            // Get the router
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);

            // Attach the handler to the route name exactly as in your manifest
            oRouter.getRoute("RouteDisplayTable").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function(oEvent) {
            //Set Page Title
            var oPanel = this.byId("DataTablePage");
            oPanel.setTitle(this.getOwnerComponent().getModel("shared").getProperty("/SelectedTableID") + ": Display of Entries Found");

            //Load Search Data
            this.byId("SearchInTableInputBox").setValue(this.getOwnerComponent().getModel("shared").getProperty("/SelectedTableID"))
            this.byId("TableSummaryInputBox").setValue(this.getOwnerComponent().getModel("shared").getProperty("/SelectedTable"))
            this.byId("TableSummaryExtraText").setText(this.getOwnerComponent().getModel("shared").getProperty("/SelectedTableSummary"))
            this.byId("MaximumNumHitsInputBox").setValue(this.getOwnerComponent().getModel("shared").getProperty("/MaxNumHits"))

            //Create Table
            this.createDataTable();
        },

        //Nav Back
        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteMainView");
        },

        createDataTable: function () {
            var that = this;
            var oPanel = this.byId("DataTablePanel");
            var iMaxHits = this.getOwnerComponent().getModel("shared").getProperty("/MaxNumHits");
            oPanel.removeAllContent();

            // Create UI Table (selection none)
            var oTable = new sap.ui.table.Table({
                visibleRowCount: iMaxHits,
                columnHeaderVisible: true,
                selectionMode: sap.ui.table.SelectionMode.None,
                enableColumnReordering: true
            });

            // Get Shared Table Data (columns config)
            var aColumnsConfig = this.getOwnerComponent().getModel("shared").getProperty("/SavedTableData");

            // Make search filters
            var aFilters = [];
            aColumnsConfig.forEach(function (element) {
                if (element.Output) {
                    var sField = element.FieldName.replace(".", "/");
                    var sFrom = element.FromValue;
                    var sTo = element.ToValue;

                    if (sFrom && sTo) { // BETWEEN
                        aFilters.push(new sap.ui.model.Filter(sField, sap.ui.model.FilterOperator.BT, sFrom, sTo));
                    } else if (sFrom) { // Contains / >=
                        aFilters.push(new sap.ui.model.Filter(sField, sap.ui.model.FilterOperator.Contains, sFrom));
                    } else if (sTo) { // <=
                        aFilters.push(new sap.ui.model.Filter(sField, sap.ui.model.FilterOperator.LE, sTo));
                    }
                }
            });

            // Add columns dynamically
            aColumnsConfig.forEach(function (element) {
                if (element.Output) {
                    oTable.addColumn(new sap.ui.table.Column({
                        label: new sap.ui.commons.Label({ text: element.FieldNameText }),
                        template: new sap.ui.commons.TextView({ 
                            text: "{" + element.FieldName.replace(/\./g, "/") + "}" 
                        }),
                        sortProperty: element.FieldName.replace(/\./g, "/"),
                        filterProperty: element.FieldName.replace(/\./g, "/")
                    }));
                }
            });

            // Add "Details" column with button/icon
            oTable.addColumn(new sap.ui.table.Column({
                label: new sap.ui.commons.Label({ text: "" }),
                template: new sap.m.Button({
                    icon: "sap-icon://display-more",
                    tooltip: "View More Detail",
                    press: function (oEvent) {
                        var oContext = oEvent.getSource().getBindingContext();
                        var oRowData = oContext.getObject();

                        // Create dialog dynamically
                        var oDialog = new sap.m.Dialog({
                            title: "Row Details",
                            contentWidth: "50%",
                            content: new sap.m.Table({
                                width: "100%",
                                columns: [
                                    new sap.m.Column({ header: new sap.m.Label({ text: "Key" }) }),
                                    new sap.m.Column({ header: new sap.m.Label({ text: "Value" }) })
                                ],
                                items: Object.keys(oRowData)
                                    .filter(function(key) { return key !== "__metadata" && !key.includes("LocalNav"); })
                                    .map(function (key) {

                                        var value = oRowData[key];
                                        if (value === undefined || value === null) {
                                            value = "";
                                        }

                                        // If value is object (navigation property)
                                        return new sap.m.ColumnListItem({
                                            cells: [
                                                new sap.m.Text({ text: key }),
                                                new sap.m.Text({ text: value })
                                            ]
                                        });
                                    })
                            }),
                            beginButton: new sap.m.Button({
                                text: "Close",
                                press: function () {
                                    oDialog.close();
                                }
                            }),
                            afterClose: function () {
                                oDialog.destroy();
                            }
                        });

                        that.getView().addDependent(oDialog);
                        oDialog.open();

                        function showObjectDialog(title, objectData) {

                            var oNestedDialog = new sap.m.Dialog({
                                title: title,
                                contentWidth: "40%",
                                contentHeight: "400px",
                                resizable: true,
                                draggable: true,
                                content: new sap.m.ScrollContainer({
                                    vertical: true,
                                    content: new sap.m.TextArea({
                                        width: "100%",
                                        editable: false,
                                        value: JSON.stringify(objectData, null, 2)
                                    })
                                }),
                                beginButton: new sap.m.Button({
                                    text: "Close",
                                    press: function () {
                                        oNestedDialog.close();
                                    }
                                }),
                                afterClose: function () {
                                    oNestedDialog.destroy();
                                }
                            });

                            oNestedDialog.open();
                        }
                    }
                }),
                width: "50px",
                hAlign: "Center"
            }));

            // Panel busy + runtime start
            oPanel.setBusy(true);
            oPanel.setBusyIndicatorDelay(0);
            var iStartTime = performance.now();
            var oRunTimeInput = this.byId("RunTimeInputBox");
            var oRunTimeText = this.byId("RunTimeExtraText");
            oRunTimeText.setText("Running...");
            oRunTimeInput.setValue("");

            // Get table name and OData model
            var sSelectedTable = this.getOwnerComponent().getModel("shared").getProperty("/SelectedTable");
            var oODataModel = this.getView().getModel();

            var aExpand = this.getOwnerComponent()
                .getModel("shared")
                .getProperty("/SelectedChildTables");

            var sExpand = aExpand.length ? aExpand.join(",") : undefined;

            var mParams = {
            };

            if (sExpand != undefined) {
                mParams["$expand"] = sExpand;
            }
            // Step 1: Get total count
            oODataModel.read("/" + sSelectedTable + "/$count", {
                filters: aFilters,
                urlParameters: mParams,
                success: function (oCount) {
                    var iTotalCount = parseInt(oCount, 10);
                    that.byId("NumberOfHitsInputBox").setValue(iTotalCount);

                    // Step 2: Load data in batches
                    var aAllData = [];

                    function loadBatch(iSkip) {
                        var bParams = {
                            "$top": Math.min(1000, iMaxHits),
                            "$skip": iSkip
                        };

                        if (sExpand != undefined) {
                            bParams["$expand"] = sExpand;
                        }
                        oODataModel.read("/" + sSelectedTable, {
                            filters: aFilters,
                            urlParameters: bParams,
                            success: function (oData) {
                                aAllData = aAllData.concat(oData.results);

                                if (oData.results.length === 1000) {
                                    loadBatch(iSkip + 1000);
                                } else {
                                    finalizeTable(aAllData);
                                }
                            },
                            error: function (oError) {
                                console.error("Error loading table batch:", oError);
                                oPanel.setBusy(false);
                            }
                        });
                    }

                    function finalizeTable(aData) {
                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData({ rows: aData });
                        oTable.setModel(oJSONModel);
                        oTable.bindRows("/rows");

                        // Store reference for export
                        that._oExportModel = oJSONModel;
                        that._aExportColumns = aColumnsConfig.filter(e => e.Output);

                        // Adjust visible rows dynamically
                        oTable.setVisibleRowCount(aData.length);
                        oPanel.addContent(oTable);
                        oPanel.setBusy(false);

                        // Show runtime
                        var iEndTime = performance.now();
                        var iRuntimeMs = iEndTime - iStartTime;
                        var iRuntimeSeconds = (iRuntimeMs / 1000).toFixed(3);
                        oRunTimeInput.setValue(iRuntimeSeconds + " s");
                        oRunTimeText.setText("Complete");
                    }

                    // Start loading first batch
                    loadBatch(0);
                    console.log(aAllData[0]); // should be an array
                },
                error: function (oError) {
                    console.error("Error loading count:", oError);
                    oPanel.setBusy(false);
                }
            });
        },

        onExportCSV: function () {

            var aData = this._oExportModel.getProperty("/rows");
            var aColumns = this._aExportColumns;

            var aCsv = [];

            // Header row
            var aHeaders = aColumns.map(col => col.FieldNameText);
            aCsv.push(aHeaders.join(";"));

            // Data rows
            aData.forEach(function (row) {
                var aRow = [];

                aColumns.forEach(function (col) {
                    aRow.push(row[col.FieldName] ?? "");
                });

                aCsv.push(aRow.join(";"));
            });

            var sCsvContent = aCsv.join("\n");

            var blob = new Blob([sCsvContent], { type: "text/csv;charset=utf-8;" });
            var url = URL.createObjectURL(blob);

            var link = document.createElement("a");
            link.href = url;
            link.download = "Export.csv";
            link.click();
        },

        onExportExcel: function () {

            var aData = this._oExportModel.getProperty("/rows");
            var aColumns = this._aExportColumns;

            var aExcelColumns = aColumns.map(function (col) {
                return {
                    label: col.FieldNameText,
                    property: col.FieldName
                };
            });

            var oSettings = {
                workbook: {
                    columns: aExcelColumns
                },
                dataSource: aData,
                fileName: "Export.xlsx"
            };

            var oSpreadsheet = new Spreadsheet(oSettings);
            oSpreadsheet.build().finally(function () {
                oSpreadsheet.destroy();
            });
        }
    });
});

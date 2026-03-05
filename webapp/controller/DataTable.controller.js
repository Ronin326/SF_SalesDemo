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

            // Add "Details" column with button/icon
            oTable.addColumn(new sap.ui.table.Column({
                label: new sap.ui.commons.Label({ text: "" }),
                template: new sap.m.Button({
                    icon: "sap-icon://display-more",
                    tooltip: "View More Detail",
                    press: function (oEvent) {
                        var oContext = oEvent.getSource().getBindingContext();
                        var oRowData = oContext.getObject();

                        var aMainFields = [];
                        var aNavSections = [];
                        var aChildTables = [];

                        Object.keys(oRowData).forEach(function (key) {
                            var value = oRowData[key];
                            
                            if (key === "__metadata") return;

                            // -----------------------------
                            // CHILD TABLE NAVIGATION
                            // -----------------------------
                            if (value && value.results && Array.isArray(value.results)) {
                                var oChildTable = new sap.m.Table({
                                    headerText: key,
                                    columns: []
                                });

                                if (value.results.length > 0) {
                                    // Create columns dynamically
                                    Object.keys(value.results[0]).forEach(function (childKey) {
                                        if (childKey !== "__metadata" && typeof value.results[0][childKey] !== "object") {
                                            oChildTable.addColumn(
                                                new sap.m.Column({
                                                    header: new sap.m.Label({ text: childKey })
                                                })
                                            );
                                        }
                                    });

                                    // Create rows
                                    value.results.forEach(function (row) {
                                        var cells = [];
                                        Object.keys(row).forEach(function (childKey) {
                                            if (childKey !== "__metadata" && typeof row[childKey] !== "object") {
                                                cells.push(new sap.m.Text({ text: row[childKey] || "" }));
                                            }
                                        });
                                        oChildTable.addItem(
                                            new sap.m.ColumnListItem({ cells: cells })
                                        );
                                    });
                                }

                                // Wrap each child table in an expandable panel
                                aChildTables.push(
                                    new sap.m.Panel({
                                        headerText: key,
                                        expandable: true,
                                        expanded: false,
                                        content: [oChildTable]
                                    })
                                );
                            }

                            // -----------------------------
                            // NAVIGATION OBJECTS (single entity)
                            // -----------------------------
                            else if (value && typeof value === "object" && !value.__deferred && !Array.isArray(value) && !key.includes("Date")) {
                                var aNavFields = [];
                                Object.keys(value).forEach(function (childKey) {
                                    if (childKey === "__metadata") return;

                                    if (typeof value[childKey] !== "object") {
                                        aNavFields.push(new sap.m.Label({ text: key + "." + childKey }));
                                        aNavFields.push(new sap.m.Text({ text: value[childKey] || "" }));
                                    }
                                });

                                if (aNavFields.length > 0) {
                                    aNavSections.push(
                                        new sap.m.Panel({
                                            headerText: key + " Details",
                                            expandable: true,
                                            expanded: false,
                                            content: [
                                                new sap.ui.layout.form.SimpleForm({
                                                    editable: false,
                                                    layout: "ResponsiveGridLayout",
                                                    columnsL: 2,
                                                    columnsM: 2,
                                                    content: aNavFields
                                                })
                                            ]
                                        })
                                    );
                                }
                            }
                            
                            else if (typeof value === "object" && key.includes("Date")) {
                                aMainFields.push(new sap.m.Label({ text: key }));
                                aMainFields.push(new sap.m.Text({ text: value || "" }));
                            }

                            // -----------------------------
                            // NORMAL FIELDS
                            // -----------------------------

                            else if (typeof value !== "object") {
                                aMainFields.push(new sap.m.Label({ text: key }));
                                aMainFields.push(new sap.m.Text({ text: value || "" }));
                            }
                        });

                        // -----------------------------
                        // MAIN INFORMATION PANEL
                        // -----------------------------
                        var oMainForm = new sap.ui.layout.form.SimpleForm({
                            editable: false,
                            layout: "ResponsiveGridLayout",
                            labelSpanL: 4,
                            labelSpanM: 4,
                            columnsL: 2,
                            columnsM: 2,
                            content: aMainFields
                        });

                        var aDialogContent = [
                            new sap.m.Panel({
                                headerText: "Main Information",
                                expandable: true,
                                expanded: true,
                                content: [oMainForm]
                            })
                        ].concat(aNavSections) // navigation objects panels
                        .concat(aChildTables); // child table panels

                        // -----------------------------
                        // DIALOG CREATION
                        // -----------------------------
                        var oDialog = new sap.m.Dialog({
                            title: "Row Details",
                            contentWidth: "70%",
                            contentHeight: "75%",
                            verticalScrolling: true,
                            content: aDialogContent,
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
                    }
                }),
                width: "50px",
                hAlign: "Center"
            }));
            
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

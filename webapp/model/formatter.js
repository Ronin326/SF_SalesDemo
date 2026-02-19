sap.ui.define([], function () {
    "use strict";

    return {
        FieldNameFormatter: function (sValue) {
            if (!sValue) return "";

            // Insert space before each uppercase letter
            var withSpaces = sValue.replace(/([A-Z])/g, ' $1');

            // Capitalize the first letter of the string
            withSpaces = withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);

            return withSpaces;
        },

        DataTableHeader: function (sValue){
            if (!sValue) return "";

            //Get Table Id
            var TableID = this.getOwnerComponent().getModel("shared").getProperty("/SelectedTableID") + ": ";

            return TableID + sValue
        }
    };
});

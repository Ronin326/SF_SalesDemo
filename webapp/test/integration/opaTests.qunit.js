/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["sfsalesdemoapp/test/integration/AllJourneys"
], function () {
	QUnit.start();
});

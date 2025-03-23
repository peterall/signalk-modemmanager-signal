const dbus = require('dbus');
const chadburn = require('chadburn');

const bus = dbus.getBus('system');

module.exports = function (app) {
    var plugin = {};

    plugin.id = 'signalk-modemmanager-signal';
    plugin.name = 'ModemManager Signal';
    plugin.description = 'Provides LTE Signal from ModemManager';

    plugin.start = async function (options, restartPlugin) {
        const path = 'electrical.modem.signalQuality';
        // notify server, once, of units metadata
        app.handleMessage(plugin.id, {
            updates: [{
                meta: [{
                    path: path,
                    value: {
                        units: 'ratio'
                    }
                }]
            }]
        });

        const modem_manager = await chadburn.ModemManager.init(bus);
        const [[dbus_path, modem]] = modem_manager.modems;
        if (!dbus_path) {
            app.setPluginStatus('No modem connected');
        } else {
            app.setPluginStatus('Using ' + dbus_path);
            const modemsignal = await modem.getAdvancedSignal();
            await modemsignal.setupPolling(1);
            modemsignal.properties$.subscribe((properties) => {
                const signalQuality = properties['SignalQuality'];
                if (typeof signalQuality === 'object') {
                    let quality = Object.keys(signalQuality)[0];
                    if (signalQuality[quality]) {
                        app.handleMessage(plugin.id, {
                            updates: [{
                                values: [{
                                    path: path,
                                    value: Number(quality) / 100,
                                }]
                            }]
                        });
                        return;
                    }
                }
                app.handleMessage(plugin.id, {
                    updates: [{
                        values: [{
                            path: path,
                            value: null,
                        }]
                    }]
                });                
            });
        }
    };

    plugin.stop = function () {
        app.setPluginStatus('Stopped');
        app.debug('Plugin stopped');
    };

    plugin.schema = {
    };

    return plugin;
}

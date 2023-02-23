import {
  NativeEventEmitter,
  NativeModules
} from 'react-native';
import { EventEmitter2 } from 'eventemitter2';

const Mqtt = NativeModules.Mqtt;
const emitter = new NativeEventEmitter(Mqtt);

class MqttClient extends EventEmitter2 {
  constructor(options, clientRef) {
    super(options.eventEmitter2Options);
    this.options = options;
    this.clientRef = clientRef;
    this._emitterSubscription = emitter.addListener('mqtt_events', this._dispatchEvent.bind(this))
  }

  _dispatchEvent(data) {
    if(data && data.clientRef === this.clientRef && data.event){
      this.emit(data.event, data.message);
    }
  }

  _destroy() {
    emitter.removeSubscription(this._emitterSubscription);
    Mqtt.removeClient(this.clientRef);
  }

  connect() {
    Mqtt.connect(this.clientRef);
  }

  disconnect() {
    Mqtt.disconnect(this.clientRef);
  }

  subscribe(topic, qos) {
    Mqtt.subscribe(this.clientRef, topic, qos);
  }

  unsubscribe(topic) {
    Mqtt.unsubscribe(this.clientRef, topic);
  }

  publish(topic, payload, qos, retain) {
    Mqtt.publish(this.clientRef, topic, payload, qos, retain);
  }

  reconnect() {
    Mqtt.reconnect(this.clientRef);
  }

  isConnected() {
    return Mqtt.isConnected(this.clientRef);
  }

  getTopics() {
    return Mqtt.getTopics(this.clientRef);
  }

  isSubbed(topic) {
    return Mqtt.isSubbed(this.clientRef, topic);
  }
}

module.exports = {
  clients: [],

  createClient: async function(options) {
    if(options.uri) {
      let pattern = /^((mqtt[s]?|ws[s]?)?:(\/\/)([0-9a-zA-Z_.\-]*):?(\d+))$/;
      let matches = options.uri.match(pattern);
      if (!matches) {
        throw new Error(`Uri passed to createClient ${options.uri} doesn't match a known protocol (mqtt:// or ws://).`);
      }
      let protocol = matches[2];
      let host = matches[4];
      let port =  matches[5];

      options.port = parseInt(port, 10);
      options.host = host;
      options.protocol = 'tcp';

      if(protocol === 'wss' || protocol === 'mqtts') {
        options.tls = true;
      }
      if(protocol === 'ws' || protocol === 'wss') {
        options.protocol = 'ws';
      }

    }

    let clientRef = await Mqtt.createClient(options);

    let client = new MqttClient(options, clientRef);

    this.clients.push(client);

    return client;
  },

  removeClient: function(client) {
    let clientIdx = this.clients.indexOf(client);

    if(clientIdx > -1) {
      this.clients.splice(clientIdx, 1);
    }

    client._destroy();
  },

  disconnectAll: function () {
    Mqtt.disconnectAll();
  },

};

<template>
  <!-- <q-page> -->
  <div id="overlay-container" class="column no-wrap">
    <RoomDialog v-if="roomState == 'joining'">
      Försöker gå med i rummet
      <q-spinner size="xl" />
    </RoomDialog>
    <RoomDialog v-else-if="roomState == 'full'" retry-button :message="roomError" @retry="init" />
    <RoomDialog v-else-if="!roomIsPopulated">
      Endast du är i det här rummet än så länge 🤷‍♀️
      <q-spinner size="lg" />
    </RoomDialog>
    <RoomDialog v-else-if="!peerIsConnected">
      Ännu ej ansluten
      <q-spinner size="lg" />
    </RoomDialog>
    <ParticipantsList class="participant-list" :participants="participants" />
    <div class="flex-grow">
      <!-- <div class="bg-yellow inner-box">
        gul
      </div> -->
      <video
        ref="mainVideo"
        class="main-video"
        autoplay
        muted
      />
      <audio ref="remoteAudio" autoplay />
    </div>
    <q-toolbar class="">
      <q-toolbar-title class="q-mr-xl" shrink>
        {{ roomName }}
      </q-toolbar-title>

      <!-- <div class="row no-wrap justify-evenly"> -->
      <q-select
        class="device-select-box col-auto q-mx-md"
        dense
        label="Video"
        outlined
        :options="availableVideoDevices"
        option-value="deviceId"
        emit-value
        map-options
        :value="videoDeviceId"
        @input="setChosenVideoDeviceId($event); devicesChanged = true"
      >
        <template v-slot:selected-item="scope">
          <span class="ellipsis">{{ scope.opt.label }}</span>
        </template>
      </q-select>

      <q-select
        class="device-select-box  col-auto q-mx-md"
        dense
        label="Microphone"
        outlined
        :options="availableAudioInDevices"
        option-value="deviceId"
        emit-value
        map-options
        :value="audioInDeviceId"
        @input="setChosenAudioInDeviceId($event); devicesChanged = true"
      >
        <template v-slot:selected-item="scope">
          <span class="ellipsis">{{ scope.opt.label }}</span>
        </template>
      </q-select>

      <!-- <q-select
        class="device-select-box  col-auto q-mx-md"
        dense
        label="Audio out"
        outlined
        :options="availableAudioOutDevices"
        option-value="deviceId"
        emit-value
        map-options
        :value="audioOutDeviceId"
        @input="setChosenAudioOutDeviceId($event); devicesChanged = true"
      >
        <template v-slot:selected-item="scope">
          <span class="ellipsis">{{ scope.opt.label }}</span>
        </template>
      </q-select> -->

      <q-btn v-if="devicesChanged" color="primary" label="applicera" @click="onMediaDeviceSelected" />
      <!-- </div> -->
      <q-space />
      <q-btn :disable="!peerIsConnected" color="dark" class="q-mr-sm" @click="remoteToggleMic">
        <audio-icon v-show="remoteMicEnabled" ref="speakerIcon" icon="speaker" />
        <q-icon v-show="!remoteMicEnabled" name="volume_off" />
        <q-tooltip content-class="bg-accent">
          mute/unmute peer
        </q-tooltip>
      </q-btn>
      <q-btn color="dark" class="q-mr-md " @click="setMicrophoneEnabled(!localMicEnabled)">
        <audio-icon v-show="localMicEnabled" ref="micIcon" icon="mic" />
        <q-icon v-show="!localMicEnabled" name="mic_off" />
        <q-tooltip content-class="bg-accent">
          mic on/off
        </q-tooltip>
      </q-btn>
      <q-separator spaced vertical inset />
      <q-btn class="q-px-sm" color="negative" icon="call_end" @click="endCall" />
    </q-toolbar>
    <!-- <video
      ref="mainVideo"
      class="main-video col-grow"
      autoplay
    /> -->

    <!-- <q-input v-model="outChatMessage" rounded label="say something" @keyup.enter="sendMessage" /> -->
    <!-- <video
        ref="localVideo"
        :class="{'main-video': localVideoIsBig, 'thumbnail-video': !localVideoIsBig, }"
        muted
        autoplay
        @click="localVideoIsBig = !localVideoIsBig? !localVideoIsBig:localVideoIsBig"
      /> -->
    <!-- <p id="chat-message">
        {{ inChatMessage }}
      </p> -->
  </div>
  <!-- </q-page> -->
</template>

<script>

import { mapActions, mapMutations, mapState, mapGetters } from 'vuex';
// const { mapMutations, mapActions } = createNamespacedHelpers('deviceSettings');
import peerUtil from 'js/peer-utils';
import audioAnalyzer from 'js/audio-utils';
const micAnalyzer = audioAnalyzer();
const speakerAnalyzer = audioAnalyzer();
// import speakerAnalyzer from 'js/audio-utils';
import AudioIcon from 'src/components/AudioIcon.vue';
import RoomDialog from 'src/components/RoomDialog.vue';
import ParticipantsList from 'src/components/ParticipantsList.vue';

export default {
  name: 'Camera',
  components: {
    AudioIcon,
    RoomDialog,
    ParticipantsList,
  },
  data () {
    return {
      // localVideoIsBig: false,
      localStream: null,
      localMicEnabled: true,
      remoteStream: null,
      remoteMicEnabled: true,
      videoTrackSettings: null,
      // inChatMessage: 'message',
      // outChatMessage: '',
      // chosenVideoInputId: null,
      // chosenAudioInputId: null,
      devicesChanged: false,
    };
  },
  computed: {
    /** @returns {any} */
    ...mapState({
      username: state => state.authState.currentUser,
      roomName: state => state.connectionSettings.roomName,
      roomState: state => state.connectionSettings.roomState,
      roomError: state => state.connectionSettings.roomError,
      roomMembers: state => state.connectionSettings.roomMembers,
      socketId: state => state.connectionSettings.socketId,
      videoDeviceId: state => state.deviceSettings.chosenVideoDeviceId,
      audioInDeviceId: state => state.deviceSettings.chosenAudioInDeviceId,
      audioOutDeviceId: state => state.deviceSettings.chosenAudioOutDeviceId,
      // availableMediaDevices: state => state.deviceSettings.availableMediaDevices,
      // availableVideoInputDevices: state => state.deviceSettings.availableVideoInputDevices,
    }),
    /** @returns {any} */
    ...mapGetters({
      availableVideoDevices: 'deviceSettings/availableVideoDevices',
      availableAudioInDevices: 'deviceSettings/availableAudioInDevices',
      availableAudioOutDevices: 'deviceSettings/availableAudioOutDevices',
      roomIsPopulated: 'connectionSettings/roomIsPopulated',
      peerIsConnected: 'connectionSettings/peerIsConnected',
    }),
    /** @returns {object[]} */
    participants () {
      if (!this.roomMembers) {
        return [];
      }
      const nameList = this.roomMembers.map(member => {
        const id = member.id;
        const nick = member.data.nick;
        const isMe = id === this.socketId;
        // const name = `${nick}${isMe ? ' (du)' : ''}`;
        return {
          name: nick, id, isMe, sender: member.data.sender,
        };
      });
      // nameList.push({
      //   name: 'klasse mcdonald med dasen och den långa halsen', id: 'asdfasdfasdf', isMe: true, sender: false,
      // });
      return nameList;
    },
  },
  sockets: {
    connect (data) {
      console.log('socket connected: ', data);
    },
    room (data) {
      console.log('room event from socket', data);
    },
    roomFull (msg) {
      console.log('roomFull:', msg);
    },
    signal (data) {
      console.log('signal event from socket', data);
      peerUtil.signalPeer(data);
    },
    errorMessage (msg) {
      console.log('socket error message:', msg);
    },
  },
  async mounted () {
    await this.init();
  },
  async beforeDestroy () {
    const response = await this.$socket.client.request('leave', this.roomName);
    this.setRoom(response);
    micAnalyzer.detachStream();
    speakerAnalyzer.detachStream();
    peerUtil.destroyPeer();
    if (this.localStream) {
      console.log('stopping previous tracks');
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
    }
  },
  methods: {
    async init () {
      this.setRoomState({ state: 'joining', error: '' });
      try {
        // const videoConstraints = {
        //   deviceId: this.videoDeviceId,
        // };
        // const audioConstraints = {
        //   deviceId: this.audioInDeviceId,
        // };
        // this.localStream = await peerUtil.getLocalMediaStream(videoConstraints, audioConstraints);
        // this.$refs.mainVideo.srcObject = this.localStream;
        await this.requestMediaDevices();
        await peerUtil.populateAvailableMediaDevices();

        this.videoTrackSettings = this.localStream.getVideoTracks()[0].getSettings();
      } catch (e) {
        console.error(e);
      }
      console.log('creating peer with streamobject: ', this.localStream);
      // await peerUtil.createPeer(false, (d) => this.$socket.client.emit('signal', d), this.onStream, this.onData, this.onClose, this.localStream);
      // this.$socket.client.emit('peerObjectCreated');
      await this.createPeer();
      const response = await this.$socket.client.request('join', this.roomName, { nick: this.username, sender: true });
      if (response.error) {
        console.error(response.error);
        return;
      }
      this.setRoom(response);

      console.log(this.availableVideoDevices);
    },
    ...mapMutations('deviceSettings', ['setChosenVideoDeviceId', 'setChosenAudioInDeviceId', 'setChosenAudioOutDeviceId']),
    ...mapMutations('connectionSettings', ['setRoomState']),
    ...mapActions('deviceSettings', ['saveChosenDevicesToStorage']),
    ...mapActions('connectionSettings', ['setRoom']),
    async createPeer () {
      await peerUtil.createPeer(false, this.onConnect, (d) => this.$socket.client.emit('signal', d), this.onStream, null, this.onData, this.onClose, this.localStream);
      this.$socket.client.emit('peerObjectCreated');
    },
    onConnect () {
      this.sendData('micEnabled', this.localMicEnabled);
    },
    async onStream (stream) {
      console.log('received remote stream!!!', stream);
      this.remoteStream = stream;
      this.$refs.remoteAudio.srcObject = stream;

      await speakerAnalyzer.attachStream(this.remoteStream);
      speakerAnalyzer.attachCallback(value => {
      // console.log(value);
        this.$refs.speakerIcon.setMeterHeight(value * 1.4);
        // this.debugData.localVolume = value;
      });
    },
    onData (type, data) {
      if (type === 'micEnabled') {
        this.remoteMicEnabled = data;
      } else if (type === 'setMicEnabled') {
        this.setMicrophoneEnabled(data);
      }
      // this.inChatMessage = data;
    },
    async onClose () {
      // await peerUtil.createPeer(false, (d) => this.$socket.client.emit('signal', d), this.onStream, null, this.onData, this.onClose, this.localStream);
      this.remoteStream = null;
      this.createPeer();
    },
    setMicrophoneEnabled (isEnabled) {
      this.localMicEnabled = isEnabled;
      if (this.localStream) {
        this.localStream.getAudioTracks()[0].enabled = this.localMicEnabled;
        this.sendData('micEnabled', this.localMicEnabled);
      }
      // toggleMute();
    },
    remoteToggleMic () {
      peerUtil.sendData('setMicEnabled', !this.remoteMicEnabled);
    },
    endCall () {
      // peerUtil.destroyPeer();
      this.$router.replace('/camera');
    },
    sendData (type, data) {
      peerUtil.sendData(type, data);
    },
    async requestMediaDevices () {
      const videoId = this.videoDeviceId;
      const videoConstraint = videoId ? { deviceId: { exact: videoId } } : true;
      // videoConstraint.frameRate = 15;
      // videoConstraint.width = 3840;
      // videoConstraint.height = 1920;
      const audioId = this.audioInDeviceId;
      const audioConstraint = audioId ? { deviceId: audioId } : true;

      // stope previous tracks if present
      if (this.localStream) {
        console.log('stopping previous tracks');
        this.localStream.getTracks().forEach(track => {
          track.stop();
        });
      }
      this.localStream = await peerUtil.getLocalMediaStream(videoConstraint, audioConstraint);
      console.log('localStream set to:', this.localStream);

      await micAnalyzer.attachStream(this.localStream);
      micAnalyzer.attachCallback(value => {
      // console.log(value);
        this.$refs.micIcon.setMeterHeight(value * 1.4);
        // this.debugData.localVolume = value;
      });

      // const videoTrack = this.localStream.getVideoTracks()[0];
      // const capabilities = videoTrack.getCapabilities();
      // console.log('capabilities: ', capabilities);
      // console.log('settings', videoTrack.getSettings());

      this.$refs.mainVideo.srcObject = this.localStream;
      console.log('ref srcObj after setting it:', this.$refs.mainVideo.srcObject);
    },
    async onMediaDeviceSelected () {
      this.devicesChanged = false;
      await this.requestMediaDevices();
      this.saveChosenDevicesToStorage();
      this.setMicrophoneEnabled(this.localMicEnabled);
      peerUtil.setPeerOutputStream(this.localStream);
      // const videoId = this.videoDeviceId;
      // const videoConstraint = videoId ? { deviceId: videoId } : true;
      // // videoConstraint.frameRate = 15;
      // // videoConstraint.width = 3840;
      // // videoConstraint.height = 1920;
      // const audioId = this.audioInDeviceId;
      // const audioConstraint = audioId ? { deviceId: audioId } : true;
      // this.localStream = await peerUtil.getLocalMediaStream(videoConstraint, audioConstraint);
      // this.saveChosenDevicesToStorage();

      // // const videoTrack = this.localStream.getVideoTracks()[0];
      // // const capabilities = videoTrack.getCapabilities();
      // // console.log('capabilities: ', capabilities);
      // // console.log('settings', videoTrack.getSettings());

      // this.$refs.mainVideo.srcObject = this.localStream;
      // peerUtil.setPeerOutputStream(this.localStream);
    },
  },
};
</script>

<style scoped lang="scss">
#overlay-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  // background-color: rgba(0, 30, 255, 0.2);
  z-index: 100;
  pointer-events: none;
  * {
    pointer-events: auto;
  }
}

.participant-list {
  position: absolute;
  top: 2rem;
  right: 2rem;
}

.main-video {
  // z-index: -1;
  width: 100%;
  max-height: 100%
}

.flex-grow {
  flex: 1;
  min-height: 0;
}

.device-select-box {
  flex: 0 1 auto;
  width: 20rem;
  // white-space: nowrap;
  // overflow: hidden;
  // text-overflow: ellipsis;
  // width: 20%;
}

// .inner-box {
//   height: 100%;
//   width: 50%
// }

// .thumbnail-video {
//   background-color: white;
//   width: 20vw;
//   position: fixed;
//   left: 3rem;
//   top: 3rem;
//   z-index: -1;
//   border-radius: 1rem;
//   cursor: pointer;
//   box-shadow:
//   0 2.8px 2.2px rgba(0, 0, 0, 0.034),
//   0 6.7px 5.3px rgba(0, 0, 0, 0.048),
//   0 12.5px 10px rgba(0, 0, 0, 0.06)
// }

#chat-message {
  position: fixed;
  // z-index: 60;
  bottom: 5vh;
  font-size: 2.5rem;
  color: white;
  width: 100vw;
  text-align: center;
  margin: 0;
}

</style>

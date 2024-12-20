<template>
  <video ref="videoPlayer" autoplay></video>
</template>
<script setup>
import {onMounted, onUnmounted, reactive, ref} from "vue";
import Hls from "hls.js";
import {ElMessage} from "element-plus";
import {formatSeconds} from "@/utils/timeUtils.js";

const emit = defineEmits();
const videoPlayer = ref(null);
const hlsReactive = reactive({
  hls: null,
  playInfoInterval: null,
  init() {
    if (Hls.isSupported()) {
      // 创建 Hls.js 实例
      hlsReactive.hls = new Hls();
      hlsReactive.initHlsEvent();
      hlsReactive.getPlayInfo();
      // 定期更新缓冲区信息
      hlsReactive.playInfoInterval = setInterval(() => {
        hlsReactive.getPlayInfo();
      }, 1000);
    } else {
      ElMessage({
        message: '加载失败，请于项目的 issues 提交 bug ',
        type: 'error',
      })
    }
  },
  initHlsEvent() {
    // 监听 Hls.js 加载和播放错误事件
    hlsReactive.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        hlsReactive.show = false;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            ElMessage({
              message: '播放失败：拉取不到资源，请检查网络',
              type: 'error',
            })
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            ElMessage({
              message: '播放失败：媒体格式不支持',
              type: 'error',
            })
            break;
          case Hls.ErrorTypes.OTHER_ERROR:
            ElMessage({
              message: '播放失败：其他错误',
              type: 'error',
            })
            break;
          default:
            console.error('播放失败：未知错误');
            break;
        }
        emit('update:isPlay', false)
      }
    });

    // 清理 Hls.js 实例
    hlsReactive.hls.on(Hls.Events.DESTROYED, () => {
      hlsReactive.hls.destroy();
      clearInterval(bufferInterval);
    });

    // 监听缓冲区状态
    hlsReactive.hls.on(Hls.Events.BUFFER_CREATED, (event, data) => {
      hlsReactive.updateBufferInfo();
    });
  },
  getPlayInfo() {
    let bufferInfo = hlsReactive.updateBufferInfo();
    let networkSpeed = hlsReactive.updateNetworkInfo();
    let videoSize = hlsReactive.updateVideoSize();
    let playerTime = hlsReactive.updatePlayTime();
    emit('update:playInfo', {bufferInfo, networkSpeed, videoSize, playerTime})
  },
  updatePlayTime() {
    if (videoPlayer.value && videoPlayer.value.played && videoPlayer.value.played.length > 0) {
      return videoPlayer.value.played.end(0);
    }
    return 0;
  },
  updateVideoSize() {
    if (videoPlayer.value) {
      return `${videoPlayer.value.videoWidth} x ${videoPlayer.value.videoHeight}`;
    }
  },
  // 更新缓冲区信息的方法
  updateBufferInfo() {
    if (videoPlayer.value) {
      return videoPlayer.value.duration || 0;
    }
    return 0
  },
  // 更新网络信息
  updateNetworkInfo() {
    if (this.hls && this.hls.bandwidthEstimate) {
      let bps = this.hls.bandwidthEstimate;
      const kbps = bps / 8 / 1024;
      if (kbps >= 1024) {
        return (kbps / 1024).toFixed(2) + ' MB/s';
      } else {
        return kbps.toFixed(2) + ' KB/s';
      }
    }
    return '尚未下载';
  },

  loadURL(url) {
    // 加载 M3U8 文件
    hlsReactive.hls.loadSource(url);
    hlsReactive.hls.attachMedia(videoPlayer.value);
    hlsReactive.videoInfo = {
      resolution: '',
      networkSpeed: '',
      bufferLength: 0,
    };
  },
  isPlay: false,
  playPause() {
    if (videoPlayer.value) {
      if (videoPlayer.value.paused) {
        videoPlayer.value.play();
        emit('update:isPlay', true)
      } else {
        videoPlayer.value.pause();
        emit('update:isPlay', false)
      }

    }
  },
  stop() {
    if (videoPlayer.value) {
      videoPlayer.value.pause();
      videoPlayer.value.currentTime = 0;
      emit('update:isPlay', false)
    }
  },
  refresh() {
    if (hlsReactive.hls) {
      emit('update:playInfo', {})
      hlsReactive.hls.destroy();
      hlsReactive.init();
      hlsReactive.loadURL(props.modelValue);
      emit('update:isPlay', true)
      emit('update:refresh')
    }
  },
  volumeValue: 0,
  setVolume() {
    if (videoPlayer.value) {
      videoPlayer.value.volume = hlsReactive.volumeValue / 100;
      emit('update:volume', videoPlayer.value.volume)
    }
  },
});
const getVideoAudio = reactive({
  get() {
    const videoEl = document.querySelector('video');
    const mediaStream = videoEl.captureStream();

    // 输出完整的 mediaStream 信息
    console.log(mediaStream);

    // 获取所有音频轨道并检查
    const audioTracks = mediaStream.getAudioTracks();
    console.log(audioTracks);


    const audioTrack = audioTracks[0];
    console.log(audioTrack);
    // 创建MediaRecorder来获取音频数据
    const mediaRecorder = new MediaRecorder(new MediaStream([audioTrack]));
    mediaRecorder.ondataavailable = (e) => {
      console.log(e.data);
    };
    console.log(mediaRecorder);
    mediaRecorder.start(100);
  }
})
let props = defineProps(['modelValue']);

onMounted(() => {
  hlsReactive.init();
  hlsReactive.loadURL(props.modelValue);
  // getVideoAudio.get();
})

onUnmounted(() => {
  clearInterval(hlsReactive.playInfoInterval)
})
defineExpose({
  playPause: hlsReactive.playPause,
  stop: hlsReactive.stop,
  refresh: hlsReactive.refresh,
  setVolume: hlsReactive.setVolume,
})
</script>
<style scoped>

</style>
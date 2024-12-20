export class AudioRecorder {
    constructor() {
        this.recordSampleRate;
        this.ws = null;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.processor = null;
        this.stream = null;
    }

    async connect() {
        this.ws = new WebSocket('ws://localhost:1234');

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'result') {
                console.log('Recognition result:', data.text);
                // 在这里处理识别结果
            }
        };

        return new Promise((resolve, reject) => {
            this.ws.onopen = () => resolve();
            this.ws.onerror = (error) => reject(error);
        });
    }

    async startRecording() {
        try {
            // this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // this.audioContext = new AudioContext({
            //     sampleRate: 16000, // 匹配后端的采样率
            //     latencyHint: 'interactive'
            // });
            //
            // const source = this.audioContext.createMediaStreamSource(this.stream);
            // this.processor = this.audioContext.createScriptProcessor(1024, 1, 1);
            //
            // source.connect(this.processor);
            // this.processor.connect(this.audioContext.destination);
            //
            // this.processor.onaudioprocess = (e) => {
            //     if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            //         // 获取音频数据并转换为Float32Array
            //         const inputData = new Float32Array(e.inputBuffer.getChannelData(0));
            //         this.ws.send(inputData);
            //     }
            // };
            let list = [new URL("./0.wav", import.meta.url),
                new URL("./1.wav", import.meta.url),
                new URL("./2.wav", import.meta.url),
                new URL("./3.wav", import.meta.url),
                new URL("./8k.wav", import.meta.url)];
            for (const item of list) {
                const response = await fetch(item);
                const arrayBuffer = await response.arrayBuffer();
                const int16Array = new Int16Array(arrayBuffer);
                const remainingInt16 = int16Array.slice(22);
                const float32Array = new Float32Array(remainingInt16.length);
                for (let i = 0; i < remainingInt16.length; i++) {
                    float32Array[i] = remainingInt16[i] / 32768;
                }
                this.ws.send(float32Array);
            }
        } catch (error) {
            console.error('Error starting recording:', error);
            throw error;
        }
    }


    /**
     * 下采样缓冲区数据
     * 当需要将音频数据导出为较低的采样率时，此函数用于减少缓冲区的采样率
     * 它通过计算原始采样率与目标采样率之间的比率，并使用该比率来确定新缓冲区的长度和值
     *
     * @param {Float32Array} buffer - 原始音频缓冲区
     * @param {number} exportSampleRate - 目标采样率
     * @returns {Float32Array} - 下采样后的音频缓冲区
     */
    downsampleBuffer(buffer, exportSampleRate) {
        // 如果目标采样率与记录采样率相同，则无需处理，直接返回原始缓冲区
        if (exportSampleRate === this.recordSampleRate) {
            return buffer;
        }

        // 计算原始采样率与目标采样率之间的比率
        let sampleRateRatio = this.recordSampleRate / exportSampleRate;
        // 根据采样率比率计算新缓冲区的长度
        let newLength = Math.round(buffer.length / sampleRateRatio);
        // 创建一个新长度的Float32Array用于存储结果
        let result = new Float32Array(newLength);

        // 初始化结果缓冲区和原始缓冲区的偏移量
        let offsetResult = 0;
        let offsetBuffer = 0;

        // 遍历结果缓冲区的每个位置，计算其值
        while (offsetResult < result.length) {
            // 计算下一个原始缓冲区的偏移量
            let nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
            // 初始化累加器和计数器用于计算平均值
            let accum = 0, count = 0;

            // 遍历原始缓冲区中对应的部分，计算平均值
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }

            // 将计算出的平均值赋给结果缓冲区
            result[offsetResult] = accum / count;
            // 更新结果缓冲区和原始缓冲区的偏移量
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }

        // 返回下采样后的缓冲区
        return result;
    };

    stopRecording() {
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
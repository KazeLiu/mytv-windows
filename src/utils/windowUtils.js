import {WebviewWindow} from '@tauri-apps/api/webviewWindow'
import {load} from "@tauri-apps/plugin-store";
import {core} from "@tauri-apps/api";
import {open} from '@tauri-apps/plugin-shell';

const defaultOptions = {
    // minWidth: 900,
    // minHeight: 507,
    // width: 1280,
    // height: 720,
    width: 128,
    height: 72,
    center: true,
    focus: true,
    visible: true,
    title: 'Kaze Player',
}

export async function openNewPlayerWindow(url, windowOption, channelInfo) {
    const store = await load('playInfo.json', {autoSave: true});
    const labelId = `play-${windowOption.label}`;
    console.log(channelInfo)
    await store.set(labelId, channelInfo)
    return await openNewWindow(url, labelId, {
        ...windowOption,
        ...defaultOptions
    });
}

/**
 * 联系后台的方法来打开新的窗口 为了监听page_load信息
 * @param channelInfo 传入的频道信息 信息来源为 browserTVList 数组
 * @returns {Promise<unknown>}
 */
export async function openNewBrowserWindow(channelInfo) {
    return await core.invoke("create_browser_window", {
        label: `browser-${channelInfo.id}`,
        url: channelInfo.url,
        option: {
            ...defaultOptions,
            title: channelInfo.name + ' —— 本页面展示的是源网站内容，不代表本软件观点',
        },
        info: JSON.stringify(channelInfo)
    });

}

/**
 * tauri2前端API打开新的窗口
 * @param channelInfo 传入的频道信息 信息来源为 browserTVList 数组
 * @returns {Promise<unknown>}
 */
export async function openNewWindow(url, label, windowOption) {
    return new WebviewWindow(label, {...windowOption, url})
}


export function openBrowser(url) {
    open(url);
}
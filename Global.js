import{DeviceEventEmitter,NativeModules, NativeEventEmitter,Platform, PermissionsAndroid,} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenUtil, {const_languages} from './ScreenUtil'; 

import RNFS from 'react-native-fs';

var global = {

    inited: {nativeModules:false, data:false},
    filesDir: '',

    g_StorageBuf : {},

    enableBioAuthen: false,

    groupList: [{key:'create', groupName:'Welcome', status: '', list: []}],

    inputHeight: ScreenUtil.scaleHeight(45),
    titleHeight: ScreenUtil.scaleHeight(50),

    consoleLog(log) {
        console.log(log);
    },

    isInited() {
        return (this.inited.nativeModules==true && this.inited.data==true);
    },

    hasPermission: false,
    playingItem: {
        status: 'stop', // play, pause, stop
        item: null,
    },
    playList: {
        list: [],
        currentIndex: 0,
        playMode: 'order', // order, single, shuffle
        errFileCount: 0,
    },

    audioEvents: new NativeEventEmitter(NativeModules.AudioModule),


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    AsyncStorageMultiSet(keyValuePairs) {
        AsyncStorage.multiSet(keyValuePairs, function(errs){
            if(errs){
                //TODO：存储出错
                alert('saveClientBufferMultiSet fail!!');
                return;
            }
            //alert('数据保存成功!');
        });
    },

    AsyncStorageSetItem(key, value) {
        try {
            AsyncStorage.setItem(key, value);
        } catch (error) {
            // Error saving data
            alert('fail to save '+key);
        }
    },

    AsyncStorageRemoveItem(key) {
        try {
            AsyncStorage.removeItem(key);
        } catch (error) {
            // Error remove data
            alert('fail to remove '+key);
        }
    },

    AsyncStorageGetAllKeys(func) {
        AsyncStorage.getAllKeys((err, keys) => {
            if(err != null){
                alert("getAllKeys error:"+err.message);
                return;
            }

            AsyncStorage.multiGet(keys, (err, stores) => {
                if(err != null){
                    alert("multiGet error:"+err.message);
                    return;
                }

                func(stores);
            });
        });
       /*
       let keys = ['chartSettings','installComplete','autoLogin','lastLoginUser','lastLoginPwd','lang','saveLoginUser','saveLoginPwd']
       AsyncStorage.multiGet(keys, (err, stores) => {
            if(err != null){
                alert("multiGet error:"+err.message);
                return;
            }

            func(stores);
        });
        */
    },

    loadAsyncStorage(stores) {
        stores.map((result, i, store) => {
            // get at each store's key/value so you can work with it
            let key = store[i][0];
            //let value = store[i][1];
            this.g_StorageBuf[key] = store[i][1];
        });

        this.initData();
        this.inited.data = true;

        DeviceEventEmitter.emit('cmd', {cmd:'initLoaded',});
    },

    saveClientBufferMultiSet(keyValuePairs) {
        for (let i = 0; i < keyValuePairs.length; i++) {
            this.g_StorageBuf[keyValuePairs[i][0]] = keyValuePairs[i][1];      
        }        
        /*
        AsyncStorage.multiSet(keyValuePairs, function(errs){
            if(errs){
                //TODO：存储出错
                alert('saveClientBufferMultiSet fail!!');
                return;
            }
            //alert('数据保存成功!');
        });
        */
       this.AsyncStorageMultiSet(keyValuePairs);
    },

    saveClientBuffer(key, value) {
        this.g_StorageBuf[key] = value;
        /*
        try {
            AsyncStorage.setItem(key, value);
        } catch (error) {
            // Error saving data
            alert('fail to save '+key);
        }
        */
        this.AsyncStorageSetItem(key, value);
    },

    removeClientBuffer(key) {
        this.g_StorageBuf[key] = null;
        this.AsyncStorageRemoveItem(key);
    },

    getClientBufferStr(key) {
        return this.g_StorageBuf[key];
    },

    async getWANIp(_force) {
        let self = this;
        if (_force !== true) {
            let tNow = (new Date()).getTime();
            if (self.WANIp.refreshTimeStamp + 60*60*1000 >= tNow) return;
        }
        let bSuc = false;
        try {
            let controller = new AbortController();
            setTimeout(() => {if (controller) controller.abort()}, 5000);
            let response = await fetch('http://ip-api.com/json', {
                method: 'GET',
                cache: "no-cache",
                signal: controller.signal,
                //headers: {},
                //body: JSON.stringify(postData),
            })
            let json = await response.json();
            console.log(JSON.stringify(json))
            if (json["status"]==='success' && json["query"] && json["countryCode"]) {
                bSuc = true;
                self.WANIp.ip = json["query"];
                self.WANIp.countryCode = json["countryCode"];
                self.WANIp.refreshTimeStamp = (new Date()).getTime();
                self.saveClientBuffer('WANIp', JSON.stringify(self.WANIp));
            }
        }catch(error) {
            global.consoleLog(error);
        }
        if (bSuc === false) {
            try {
                let controller = new AbortController();
                setTimeout(() => {if (controller) controller.abort()}, 5000);
                let response = await fetch('https://ipinfo.io/json', {
                    method: 'GET',
                    cache: "no-cache",
                    signal: controller.signal,
                    //headers: {},
                    //body: JSON.stringify(postData),
                })

                let json = await response.json();
                console.log(JSON.stringify(json))
                if (json["ip"] && json["country"]) {
                    bSuc = true;
                    self.WANIp.ip = json["ip"];
                    self.WANIp.countryCode = json["countryCode"];
                    self.WANIp.refreshTimeStamp = (new Date()).getTime();
                    self.saveClientBuffer('WANIp', JSON.stringify(self.WANIp));
                }
            }catch(error) {
                global.consoleLog(error);
            }
        }
    },

    initData() {
        let _tmp = this.getClientBufferStr('chatGroupList') || "[]";
        this.chatGrpList = JSON.parse(_tmp);
        for (let i = 0; i < this.chatGrpList.length; i++) {
            this.chatGrpList[i].chatGrpStatus = 'disconnect';
        }
        this.consoleLog('@#@#@# '+_tmp);

        _tmp = this.getClientBufferStr('yourProfile') || JSON.stringify({name:'Anonymous', icon:{font:'MaterialIcons', name:'tag-faces', color:ScreenUtil.getTextColor('keyColor')}});
        this.yourProfile = JSON.parse(_tmp);

        _tmp = this.getClientBufferStr('generalSettings') || JSON.stringify({lang:0, textSize:2});
        this.generalSettings = JSON.parse(_tmp);
        ScreenUtil.lang = const_languages[this.generalSettings.lang];

        _tmp = this.getClientBufferStr('appPwd') || JSON.stringify({enable:false, pwd:''});
        this.appPwd = JSON.parse(_tmp);

        _tmp = this.getClientBufferStr('enableBioAuthen') || "0";
        this.enableBioAuthen = _tmp === "1"?true:false;

        _tmp = this.getClientBufferStr('WANIp') || JSON.stringify({ip:'', countryCode:'', refreshTimeStamp:0}); //JP
        this.WANIp = JSON.parse(_tmp);
        /*
        let self = this;
        self.getWANIp();
        setInterval(() => {
            self.getWANIp();
        }, 30000);
        */

        this.deviceID = this.getClientBufferStr('deviceID') || '';
        if (this.deviceID === '' || this.deviceID.length!=8) {
            this.deviceID = this.randomString(8);
            this.saveClientBuffer('deviceID', this.deviceID);
        }
        NativeModules.MyNativeModule.jsonCmd(JSON.stringify({
                    cmd:"setDeviceID", 
                    deviceID:this.deviceID, 
                })).then(
            (values) => {
            }
        );
        this.consoleLog('@@@@ device id: '+this.deviceID)
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	
    init() {

        // 监听事件
        this.audioEvents.addListener('onPlay', e => {
            console.log('Play:', e.url)
            DeviceEventEmitter.emit('cmd', {cmd:'playStart', msg:e});
        });
        this.audioEvents.addListener('onPause', e => {
            console.log('Paused')
            DeviceEventEmitter.emit('cmd', {cmd:'playPause', msg:e});
        });
        this.audioEvents.addListener('onStop', e => {
            console.log('Stopped')
            DeviceEventEmitter.emit('cmd', {cmd:'playStop', msg:e});
        });
        this.audioEvents.addListener('onComplete', e => {
            DeviceEventEmitter.emit('cmd', {cmd:'playComplete', msg:e});
            console.log('onComplete')
        });
        //onProgress
        this.audioEvents.addListener('onProgress', e => {
            //console.log('Progress:', e);
            DeviceEventEmitter.emit('cmd', {cmd:'playProgress', msg:e});
        });
        this.audioEvents.addListener('onRemotePlay', e => console.log('Remote Play'));
        this.audioEvents.addListener('onRemoteStop', e => console.log('Remote Stop'));
        this.audioEvents.addListener('onRemotePrevious', e => {
            console.log('Remote Previous')
            DeviceEventEmitter.emit('cmd', {cmd:'playPrevious', msg:e});
        });
        this.audioEvents.addListener('onRemoteNext', e => {
            console.log('Remote Next')
            DeviceEventEmitter.emit('cmd', {cmd:'playNext', msg:e});
        });

        /*
        // 调用播放
        AudioModule.play('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
        AudioModule.pause();
        AudioModule.seekTo(60000); // 60秒
        AudioModule.stop();
        */

        let self = this;

        console.log('Global.init NativeModules.MyNativeModule.init');
        NativeModules.MyNativeModule.init().then(
            (values) => {
                this.consoleLog('MyNativeModule.init : ' + JSON.stringify(values) );
                if (Platform.OS == 'ios') {
                    /*
                    this.consoleLog('homeDir: '+ values.homeDir);
                    this.consoleLog('cachePath: '+ values.cachePath);
                    self.g_fileFolder = values.cachePath;
                    this.consoleLog('tstWriteFile: '+ values.tst);
                    */
                    self.filesDir = values.homeDir;
                    self.cacheDir = values.cachePath;
                }
                else {
                    /*
                    this.consoleLog('MyNativeModule.init : ' + values.filesDir+' / ' + values.packageName );
                    self.g_fileFolder = values.filesDir;
                    */
                   self.filesDir = values.filesDir;
                   self.cacheDir = values.cacheDir;
                }
                self.inited.nativeModules = true;
                DeviceEventEmitter.emit('cmd', {cmd:'initLoaded',});
            }
        )
        console.log('Global.init DeviceEventEmitter listeners');

        if (Platform.OS == 'ios') {
            //const {MyNativeModule} = NativeModules;
            this.iosEmitter = new NativeEventEmitter(NativeModules.MyNativeModule);
            this.iosSubscription = this.iosEmitter.addListener(
                'iosEvent', (msgBody) => { 
                    this.consoleLog("iosEmitter: "+JSON.stringify(msgBody))
                    if (msgBody.cmd == 'native' && msgBody.msg !== "testIOSEvent1" && msgBody.msg !== "testCallbackFunc" && msgBody.msg !== "stringFromJNI: onTestMessage") {
                        //global.consoleLog("ios: "+msgBody.msg);
                        //let data = JSON.parse(msgBody.msg);
                        self.handleNativeMsg(msgBody.msg);
                    }
                }
            )
        }
		else if (Platform.OS == 'android') {
            this.listener1 = DeviceEventEmitter.addListener('cmd', (emitData) => {
                //this.consoleLog('android DeviceEventEmitter: '+JSON.stringify(emitData))
				if (emitData.cmd == 'native' && emitData.msg !== "testIOSEvent1" && emitData.msg !== "testCallbackFunc" && emitData.msg !== "stringFromJNI: onTestMessage") {
					this.handleNativeMsg(emitData.msg);
				}
            });
        }

        this.AsyncStorageGetAllKeys(this.loadAsyncStorage.bind(this));
    },
	
	release() {
        if (Platform.OS == 'android' && this.listener1) { this.listener1.remove(); }
        if (Platform.OS == 'ios' && this.iosSubscription) { this.iosSubscription.remove(); }
    },

    testCallbackFunc() {
        if (Platform.OS == 'ios') {
            NativeModules.MyNativeModule.getAppVersion((res)=>{
              console.log('ios module callback: '+res);
            })
          }
          else {
            NativeModules.MyNativeModule.testCallbackFunc('testCallbackFunc').then((res)=>{
                console.log('testCallbackFunc promise.resolve: '+res)
            });
          }
    },

    async requestAndroidAudioPermission() {
        if (Platform.OS !== 'android') {
            return true;
        }

        if (this.hasPermission) {
            return true;
        }

        try {
            const permission = Platform.Version >= 33
                ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
                : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

            const hasPermission = await PermissionsAndroid.check(permission);
            if (hasPermission) {
                return true;
            }

            const result = await PermissionsAndroid.request(permission, {
                title: '音乐读取权限',
                message: '需要读取手机音乐文件以显示本地歌曲列表',
                buttonPositive: '允许',
                buttonNegative: '拒绝',
                buttonNeutral: '稍后再说',
            });

            return result === PermissionsAndroid.RESULTS.GRANTED;
        } catch (error) {
            console.log('requestAndroidAudioPermission error:', error);
            return false;
        }
    },

    async getMusicFileList(callback) {
        if (Platform.OS !== 'android') {
            if (typeof callback === 'function') {
                callback([]);
            }
            return [];
        }

        this.hasPermission = await this.requestAndroidAudioPermission();
        if (!this.hasPermission) {
            throw new Error('Audio permission denied');
        }

        if (!NativeModules.MyNativeModule || !NativeModules.MyNativeModule.getMusicFileList) {
            throw new Error('Native method getMusicFileList is not available');
        }

        const list = await NativeModules.MyNativeModule.getMusicFileList();
        const result = Array.isArray(list) ? list : [];
        if (typeof callback === 'function') {
            callback(result);
        }
        return result;
    },

    handleNativeMsg(emitData) {
        //console.log('handleNativeMsg: '+JSON.stringify(emitData));
        //console.log(typeof(emitData));
        const obj = JSON.parse(emitData);

        if (obj.action === 'uploadFile' && obj.grpKey && obj.msgId) {
            DeviceEventEmitter.emit(obj.grpKey+'_'+obj.msgId, obj);
            return;
        }
        else if (obj.action === 'downloadFile' && obj.grpKey && obj.msgId) {
            DeviceEventEmitter.emit(obj.grpKey+'_'+obj.msgId, obj);
            return;
        }
        
        DeviceEventEmitter.emit(obj.grpKey, obj);
    },

    randomString(length) {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
           result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    },

    async deleteCacheFile(file) {
        const cacheFilePath = `${RNFS.CachesDirectoryPath}/${file}`;

        try {
            // 检查文件是否存在
            const fileExists = await RNFS.exists(cacheFilePath);
            if (fileExists) {
                // 删除文件
                await RNFS.unlink(cacheFilePath);
                console.log('文件已删除')
            } else {
                console.log('文件不存在')
            }
        } catch (error) {
            console.error('删除文件时出错:', error);
        }
    },

    async clearCacheDirectory() {
        try {
          const files = await RNFS.readDir(RNFS.CachesDirectoryPath);
          for (const file of files) {
            console.log(file.path);
            await RNFS.unlink(file.path);
          }
          console.log('缓存目录已清空');
        } catch (error) {
          console.log('清空缓存时出错:', error);
          //Alert.alert('清空失败', error.message);
        }
    },

    getTestList() {
        return [{"DATA":"/storage/emulated/0/Music/music/ 焦迈奇 x 蔡维泽  坚强的理由.mp3","ARTIST":"<unknown>","DURATION":250175,"ALBUM":"music","TITLE":" 焦迈奇 x 蔡维泽  坚强的理由"},{"DATA":"/storage/emulated/0/Music/walking/#33_120BPMusic_Rock_and_Funk_Walking.mp3","ARTIST":"<unknown>","DURATION":2472136,"ALBUM":"walking","TITLE":"#33_120BPMusic_Rock_and_Funk_Walking"},{"DATA":"/storage/emulated/0/Music/walking/#38_120BPMusic_Ambient_Walking.mp3","ARTIST":"<unknown>","DURATION":1426146,"ALBUM":"walking","TITLE":"#38_120BPMusic_Ambient_Walking"},{"DATA":"/storage/emulated/0/Music/JayChou/180BPM 周杰倫 告白氣球.mp3","ARTIST":"<unknown>","DURATION":215641,"ALBUM":"transfer","TITLE":"180BPM 周杰倫 告白氣球"},{"DATA":"/storage/emulated/0/Music/JayChou/180BPM 周杰倫 止戰之殤.mp3","ARTIST":"<unknown>","DURATION":277760,"ALBUM":"transfer","TITLE":"180BPM 周杰倫 止戰之殤"},{"DATA":"/storage/emulated/0/Music/JayChou/180BPM 周杰倫 琴傷.mp3","ARTIST":"<unknown>","DURATION":199262,"ALBUM":"transfer","TITLE":"180BPM 周杰倫 琴傷"},{"DATA":"/storage/emulated/0/Music/JayChou/180BPM 周杰倫 稻香.mp3","ARTIST":"<unknown>","DURATION":223530,"ALBUM":"transfer","TITLE":"180BPM 周杰倫 稻香"},{"DATA":"/storage/emulated/0/Music/JayChou/180BPM 周杰倫 聽媽媽的話.mp3","ARTIST":"<unknown>","DURATION":264960,"ALBUM":"transfer","TITLE":"180BPM 周杰倫 聽媽媽的話"},{"DATA":"/storage/emulated/0/Music/JayChou/180BPM 夜曲 周杰伦.mp3","ARTIST":"<unknown>","DURATION":226952,"ALBUM":"transfer","TITLE":"180BPM 夜曲 周杰伦"},{"DATA":"/storage/emulated/0/Music/JayChou/180BPM 夜的第七章 周杰伦.mp3","ARTIST":"<unknown>","DURATION":228754,"ALBUM":"transfer","TITLE":"180BPM 夜的第七章 周杰伦"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #160｜Ehrling · Chasing Palm Trees.mp3","ARTIST":"<unknown>","DURATION":183716,"ALBUM":"Archive","TITLE":"200 #160｜Ehrling · Chasing Palm Trees"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #161｜Ehrling · This Is My Passion.mp3","ARTIST":"<unknown>","DURATION":208910,"ALBUM":"Archive","TITLE":"200 #161｜Ehrling · This Is My Passion"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #162｜Ehrling · Adventure.mp3","ARTIST":"<unknown>","DURATION":156108,"ALBUM":"Archive","TITLE":"200 #162｜Ehrling · Adventure"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #163｜Ehrling · Lounge.mp3","ARTIST":"<unknown>","DURATION":231712,"ALBUM":"Archive","TITLE":"200 #163｜Ehrling · Lounge"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #164｜Ehrling · S·A·X·.mp3","ARTIST":"<unknown>","DURATION":232292,"ALBUM":"Archive","TITLE":"200 #164｜Ehrling · S·A·X·"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #165｜Ehrling · All I Need.mp3","ARTIST":"<unknown>","DURATION":187292,"ALBUM":"Archive","TITLE":"200 #165｜Ehrling · All I Need"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #166｜Ehrling · Champagne Ocean.mp3","ARTIST":"<unknown>","DURATION":217316,"ALBUM":"Archive","TITLE":"200 #166｜Ehrling · Champagne Ocean"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #167｜Ehrling · Ocean.mp3","ARTIST":"<unknown>","DURATION":174103,"ALBUM":"Archive","TITLE":"200 #167｜Ehrling · Ocean"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #168｜Ehrling · PalmTrees.mp3","ARTIST":"<unknown>","DURATION":241302,"ALBUM":"Archive","TITLE":"200 #168｜Ehrling · PalmTrees"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #169｜Ehrling · Questions.mp3","ARTIST":"<unknown>","DURATION":232896,"ALBUM":"Archive","TITLE":"200 #169｜Ehrling · Questions"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #170｜Ehrling · Sthlm Sunset.mp3","ARTIST":"<unknown>","DURATION":213113,"ALBUM":"Archive","TITLE":"200 #170｜Ehrling · Sthlm Sunset"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #171｜Ehrling · Breeze.mp3","ARTIST":"<unknown>","DURATION":256302,"ALBUM":"Archive","TITLE":"200 #171｜Ehrling · Breeze"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #172｜Ehrling · Groove.mp3","ARTIST":"<unknown>","DURATION":215504,"ALBUM":"Archive","TITLE":"200 #172｜Ehrling · Groove"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #173｜Ehrling · Heart.mp3","ARTIST":"<unknown>","DURATION":192099,"ALBUM":"Archive","TITLE":"200 #173｜Ehrling · Heart"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #174｜Ehrling · Mood.mp3","ARTIST":"<unknown>","DURATION":226905,"ALBUM":"Archive","TITLE":"200 #174｜Ehrling · Mood"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #175｜Ehrling · Road Trip.mp3","ARTIST":"<unknown>","DURATION":253306,"ALBUM":"Archive","TITLE":"200 #175｜Ehrling · Road Trip"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #176｜Ehrling · Dance With Me.mp3","ARTIST":"<unknown>","DURATION":180698,"ALBUM":"Archive","TITLE":"200 #176｜Ehrling · Dance With Me"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #177｜Ehrling · Tequila.mp3","ARTIST":"<unknown>","DURATION":217316,"ALBUM":"Archive","TITLE":"200 #177｜Ehrling · Tequila"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #178｜Ehrling · Typhoon.mp3","ARTIST":"<unknown>","DURATION":222703,"ALBUM":"Archive","TITLE":"200 #178｜Ehrling · Typhoon"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #179｜Ehrling · X·Rated.mp3","ARTIST":"<unknown>","DURATION":250288,"ALBUM":"Archive","TITLE":"200 #179｜Ehrling · X·Rated"},{"DATA":"/storage/emulated/0/Music/200BPM/Archive/200 #180｜Ehrling · Sax Education.mp3","ARTIST":"<unknown>","DURATION":178910,"ALBUM":"Archive","TITLE":"200 #180｜Ehrling · Sax Education"},{"DATA":"/storage/emulated/0/Music/Telegram/Bpm190.mp3","ARTIST":"<unknown>","DURATION":2320625,"ALBUM":"Telegram","TITLE":"Bpm190"},{"DATA":"/storage/emulated/0/Music/music/FF10 素敵たね.mp3","ARTIST":"<unknown>","DURATION":340088,"ALBUM":"music","TITLE":"FF10 素敵たね"},{"DATA":"/storage/emulated/0/Music/music/GEM鄧紫棋李香蘭.mp3","ARTIST":"<unknown>","DURATION":260859,"ALBUM":"music","TITLE":"GEM鄧紫棋李香蘭"},{"DATA":"/storage/emulated/0/Music/music/HANA菊梓喬 - 我未能忘掉你.mp3","ARTIST":"<unknown>","DURATION":224496,"ALBUM":"music","TITLE":"HANA菊梓喬 - 我未能忘掉你"},{"DATA":"/storage/emulated/0/Music/170bpm/Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_5.mp3","ARTIST":"Runseek Running Music","DURATION":1290057,"ALBUM":"Music for Running on the Treadmill: 170 BPM (Virtual Scenery)","TITLE":"Music for Running on the Treadmill: 170 BPM (Virtual Scenery)"},{"DATA":"/storage/emulated/0/Music/170bpm/Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_1.mp3","ARTIST":"<unknown>","DURATION":1551543,"ALBUM":"170bpm","TITLE":"Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_1"},{"DATA":"/storage/emulated/0/Music/170bpm/Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_2.mp3","ARTIST":"<unknown>","DURATION":1541172,"ALBUM":"170bpm","TITLE":"Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_2"},{"DATA":"/storage/emulated/0/Music/170bpm/Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_3.mp3","ARTIST":"<unknown>","DURATION":1647856,"ALBUM":"170bpm","TITLE":"Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_3"},{"DATA":"/storage/emulated/0/Music/170bpm/Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_4.mp3","ARTIST":"<unknown>","DURATION":1451128,"ALBUM":"170bpm","TITLE":"Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_4"},{"DATA":"/storage/emulated/0/Music/170bpm/Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_6.mp3","ARTIST":"<unknown>","DURATION":1554678,"ALBUM":"170bpm","TITLE":"Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_6"},{"DATA":"/storage/emulated/0/Music/170bpm/Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_7.mp3","ARTIST":"<unknown>","DURATION":1676460,"ALBUM":"170bpm","TITLE":"Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_7"},{"DATA":"/storage/emulated/0/Music/170bpm/Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_8.mp3","ARTIST":"<unknown>","DURATION":1724813,"ALBUM":"170bpm","TITLE":"Music for Running on the Treadmill_ 170 BPM (Virtual Scenery)_8"},{"DATA":"/storage/emulated/0/Music/walking/No_Damage｜No_Foundation｜Precise_120_BPM｜45_MIN_WALKING_Music｜#42.mp3","ARTIST":"<unknown>","DURATION":2970064,"ALBUM":"walking","TITLE":"No_Damage｜No_Foundation｜Precise_120_BPM｜45_MIN_WALKING_Music｜#42"},{"DATA":"/storage/emulated/0/Music/walking/No_Damage｜No_Foundation｜Precise_120_BPM｜45_MIN_WALKING_Music｜#56.mp3","ARTIST":"<unknown>","DURATION":2944430,"ALBUM":"walking","TITLE":"No_Damage｜No_Foundation｜Precise_120_BPM｜45_MIN_WALKING_Music｜#56"},{"DATA":"/storage/emulated/0/Music/walking/No_Damage｜No_Foundation｜Precise_120_BPM｜45_MIN_WALKING_Music｜#65.mp3","ARTIST":"<unknown>","DURATION":2971434,"ALBUM":"walking","TITLE":"No_Damage｜No_Foundation｜Precise_120_BPM｜45_MIN_WALKING_Music｜#65"},{"DATA":"/storage/emulated/0/Music/walking/No_Damage｜No_Foundation｜Precise_120_BPM｜45_MIN_WALKING_Music｜#69.mp3","ARTIST":"<unknown>","DURATION":2903493,"ALBUM":"walking","TITLE":"No_Damage｜No_Foundation｜Precise_120_BPM｜45_MIN_WALKING_Music｜#69"},{"DATA":"/storage/emulated/0/Music/walking/Precise 120 BPM｜45 MIN WALKING Music｜#71.mp3","ARTIST":"<unknown>","DURATION":2930498,"ALBUM":"walking","TITLE":"Precise 120 BPM｜45 MIN WALKING Music｜#71"},{"DATA":"/storage/emulated/0/Music/walking/Precise 120 BPM｜45 MIN WALKING Music｜#73.mp3","ARTIST":"<unknown>","DURATION":2676889,"ALBUM":"walking","TITLE":"Precise 120 BPM｜45 MIN WALKING Music｜#73"},{"DATA":"/storage/emulated/0/Music/walking/Precise 120 BPM｜45 MIN WALKING Music｜#75.mp3","ARTIST":"<unknown>","DURATION":2850667,"ALBUM":"walking","TITLE":"Precise 120 BPM｜45 MIN WALKING Music｜#75"},{"DATA":"/storage/emulated/0/Music/walking/Precise 120 BPM｜45 MIN WALKING Music｜#77.mp3","ARTIST":"<unknown>","DURATION":2950072,"ALBUM":"walking","TITLE":"Precise 120 BPM｜45 MIN WALKING Music｜#77"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#100.mp3","ARTIST":"<unknown>","DURATION":2994817,"ALBUM":"Telegram","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#100"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#101.mp3","ARTIST":"<unknown>","DURATION":2831813,"ALBUM":"Telegram","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#101"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#103.mp3","ARTIST":"<unknown>","DURATION":2950258,"ALBUM":"Telegram","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#103"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#104.mp3","ARTIST":"<unknown>","DURATION":2898500,"ALBUM":"Telegram","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#104"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#105.mp3","ARTIST":"<unknown>","DURATION":2934097,"ALBUM":"Telegram","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#105"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#80.mp3","ARTIST":"<unknown>","DURATION":2848694,"ALBUM":"walking125","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#80"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#82.mp3","ARTIST":"<unknown>","DURATION":2902378,"ALBUM":"walking125","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#82"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#86.mp3","ARTIST":"<unknown>","DURATION":3107782,"ALBUM":"walking125","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#86"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#88.mp3","ARTIST":"<unknown>","DURATION":2891279,"ALBUM":"walking125","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#88"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#92.mp3","ARTIST":"<unknown>","DURATION":2907556,"ALBUM":"Telegram","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#92"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#95.mp3","ARTIST":"<unknown>","DURATION":2884986,"ALBUM":"Telegram","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#95"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#96.mp3","ARTIST":"<unknown>","DURATION":3011791,"ALBUM":"Telegram","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#96"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#97.mp3","ARTIST":"<unknown>","DURATION":2874538,"ALBUM":"Telegram","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#97"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#98.mp3","ARTIST":"<unknown>","DURATION":2872099,"ALBUM":"Telegram","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#98"},{"DATA":"/storage/emulated/0/Music/walking125/Precise 125 BPM｜45 MIN WALKING Music｜#99.mp3","ARTIST":"<unknown>","DURATION":2882595,"ALBUM":"Telegram","TITLE":"Precise 125 BPM｜45 MIN WALKING Music｜#99"},{"DATA":"/storage/emulated/0/Music/music/丁薇-07 - 断翅的蝴蝶.mp3","ARTIST":"丁薇","DURATION":264651,"ALBUM":"Unknown Album","TITLE":"丁薇-07 - 断翅的蝴蝶"},{"DATA":"/storage/emulated/0/Music/music/借过一下.mp3","ARTIST":"<unknown>","DURATION":293338,"ALBUM":"music","TITLE":"借过一下"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-光辉岁月.mp3","ARTIST":"陈嘉璐 - Topic","DURATION":241345,"ALBUM":"光辉岁月","TITLE":"光辉岁月"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-再见理想.mp3","ARTIST":"陈嘉璐 - Topic","DURATION":220003,"ALBUM":"再见理想","TITLE":"再见理想"},{"DATA":"/storage/emulated/0/Music/music/冯提莫 - 空心.mp3","ARTIST":"<unknown>","DURATION":279589,"ALBUM":"music","TITLE":"冯提莫 - 空心"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-冷雨夜.mp3","ARTIST":"陈嘉璐 - Topic","DURATION":287007,"ALBUM":"冷雨夜","TITLE":"冷雨夜"},{"DATA":"/storage/emulated/0/Music/合唱/夢之旅演唱組合_一水隔天涯_•_粵唱粵精彩_cjSSVrw38Ak.mp3","ARTIST":"XuongTang Music","DURATION":3287562,"ALBUM":"夢之旅演唱組合 - 一水隔天涯 • 粵唱粵精彩","TITLE":"夢之旅演唱組合 - 一水隔天涯 • 粵唱粵精彩"},{"DATA":"/storage/emulated/0/Music/合唱/夢之旅演唱組合_溫情時代·最浪漫的事_Q7ue8BzlO58.mp3","ARTIST":"XuongTang Music","DURATION":3711347,"ALBUM":"夢之旅演唱組合 - 溫情時代·最浪漫的事","TITLE":"夢之旅演唱組合 - 溫情時代·最浪漫的事"},{"DATA":"/storage/emulated/0/Music/合唱/夢之旅演唱組合_粵唱粵迷·愛在深秋_lAzokH9TS7s.mp3","ARTIST":"XuongTang Music","DURATION":3176307,"ALBUM":"夢之旅演唱組合 - 粵唱粵迷·愛在深秋","TITLE":"夢之旅演唱組合 - 粵唱粵迷·愛在深秋"},{"DATA":"/storage/emulated/0/Music/合唱/夢之旅演唱組合 - 粵語歌曲集 [mivZkrUY_pQ].mp3","ARTIST":"XuongTang Music","DURATION":4449358,"ALBUM":"夢之旅演唱組合 - 粵語歌曲集","TITLE":"夢之旅演唱組合 - 粵語歌曲集"},{"DATA":"/storage/emulated/0/Music/合唱/夢之旅演唱組合_青春往事_外面的世界_kPBGBww3N8M.mp3","ARTIST":"XuongTang Music","DURATION":3600640,"ALBUM":"夢之旅演唱組合 - 青春往事-外面的世界","TITLE":"夢之旅演唱組合 - 青春往事-外面的世界"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-大地.mp3","ARTIST":"陈嘉璐 - Topic","DURATION":237009,"ALBUM":"大地","TITLE":"大地"},{"DATA":"/storage/emulated/0/Music/大頭針/大头针 - 值得.mp3","ARTIST":"<unknown>","DURATION":219115,"ALBUM":"大頭針","TITLE":"大头针 - 值得"},{"DATA":"/storage/emulated/0/Music/大頭針/大头针 - 放生.mp3","ARTIST":"<unknown>","DURATION":220082,"ALBUM":"大頭針","TITLE":"大头针 - 放生"},{"DATA":"/storage/emulated/0/Music/大頭針/大头针 - 曾经心痛.mp3","ARTIST":"<unknown>","DURATION":252212,"ALBUM":"大頭針","TITLE":"大头针 - 曾经心痛"},{"DATA":"/storage/emulated/0/Music/大頭針/大头针 - 秋意浓.mp3","ARTIST":"<unknown>","DURATION":250018,"ALBUM":"大頭針","TITLE":"大头针 - 秋意浓"},{"DATA":"/storage/emulated/0/Music/大頭針/大头针 翻唱合集 .mp3","ARTIST":"Ms. Zhuang","DURATION":3555109,"ALBUM":"大头针 翻唱合集","TITLE":"大头针 翻唱合集"},{"DATA":"/storage/emulated/0/Music/大頭針/大头针AI - 你看你看月亮的脸.mp3","ARTIST":"<unknown>","DURATION":283402,"ALBUM":"大頭針","TITLE":"大头针AI - 你看你看月亮的脸"},{"DATA":"/storage/emulated/0/Music/大頭針/大頭針 - 出賣.mp3","ARTIST":"<unknown>","DURATION":244689,"ALBUM":"大頭針","TITLE":"大頭針 - 出賣"},{"DATA":"/storage/emulated/0/Music/大頭針/大頭針 - 如果雲知道.mp3","ARTIST":"<unknown>","DURATION":305345,"ALBUM":"大頭針","TITLE":"大頭針 - 如果雲知道"},{"DATA":"/storage/emulated/0/Music/大頭針/大頭針 - 很愛很愛你.mp3","ARTIST":"<unknown>","DURATION":238263,"ALBUM":"大頭針","TITLE":"大頭針 - 很愛很愛你"},{"DATA":"/storage/emulated/0/Music/大頭針/大頭針 - 星語心愿.mp3","ARTIST":"<unknown>","DURATION":241972,"ALBUM":"大頭針","TITLE":"大頭針 - 星語心愿"},{"DATA":"/storage/emulated/0/Music/music/姚斯婷-男人如歌.mp3","ARTIST":"<unknown>","DURATION":3502653,"ALBUM":"music","TITLE":"姚斯婷-男人如歌"},{"DATA":"/storage/emulated/0/Music/music/姚斯婷-黃昏.mp3","ARTIST":"<unknown>","DURATION":287948,"ALBUM":"music","TITLE":"姚斯婷-黃昏"},{"DATA":"/storage/emulated/0/Music/music/丁薇 - 开始.flac","ARTIST":"丁薇","DURATION":2867160,"ALBUM":"丁薇 - 开始","TITLE":"开始"},{"DATA":"/storage/emulated/0/Music/music/情戒.mp3","ARTIST":"陳奕迅","DURATION":241375,"ALBUM":"Unknown Album","TITLE":"情戒"},{"DATA":"/storage/emulated/0/Music/大頭針/我真的受傷了(R&B) Haohao.mp3","ARTIST":"<unknown>","DURATION":273371,"ALBUM":"大頭針","TITLE":"我真的受傷了(R&B) Haohao"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-无尽空虚.mp3","ARTIST":"陈嘉璐 - Topic","DURATION":234109,"ALBUM":"无尽空虚","TITLE":"无尽空虚"},{"DATA":"/storage/emulated/0/Music/music/暗涌_黄耀明_影歌集 - 25年香港经典电影歌曲.mp3","ARTIST":"黄耀明","DURATION":231967,"ALBUM":"影歌集 - 25年香港经典电影歌曲","TITLE":"暗涌"},{"DATA":"/storage/emulated/0/Music/music/暗湧_女声合唱.mp3","ARTIST":"<unknown>","DURATION":266684,"ALBUM":"music","TITLE":"暗湧_女声合唱"},{"DATA":"/storage/emulated/0/Music/music/李玟-暗示.mp3","ARTIST":"<unknown>","DURATION":359784,"ALBUM":"music","TITLE":"李玟-暗示"},{"DATA":"/storage/emulated/0/Music/大頭針/棋子  原唱_王菲.mp3","ARTIST":"<unknown>","DURATION":252216,"ALBUM":"大頭針","TITLE":"棋子  原唱_王菲"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-灰色轨迹.mp3","ARTIST":"陈嘉璐 - Topic","DURATION":236251,"ALBUM":"灰色轨迹","TITLE":"灰色轨迹"},{"DATA":"/storage/emulated/0/Music/music/烟花易冷 (Live).mp3","ARTIST":"林志炫","DURATION":314179,"ALBUM":"Unknown Album","TITLE":"烟花易冷 (Live)"},{"DATA":"/storage/emulated/0/Music/music/画皮.mp3","ARTIST":"<unknown>","DURATION":292545,"ALBUM":"music","TITLE":"画皮"},{"DATA":"/storage/emulated/0/Music/大頭針/第一滴淚 大頭針.mp3","ARTIST":"<unknown>","DURATION":263105,"ALBUM":"大頭針","TITLE":"第一滴淚 大頭針"},{"DATA":"/storage/emulated/0/Music/大頭針/美麗的神話 大頭針 東木木.mp3","ARTIST":"<unknown>","DURATION":304823,"ALBUM":"大頭針","TITLE":"美麗的神話 大頭針 東木木"},{"DATA":"/storage/emulated/0/Music/music/許美靜-都是夜歸人.mp3","ARTIST":"<unknown>","DURATION":301140,"ALBUM":"music","TITLE":"許美靜-都是夜歸人"},{"DATA":"/storage/emulated/0/Music/music/讓一切隨風.mp3","ARTIST":"<unknown>","DURATION":264829,"ALBUM":"music","TITLE":"讓一切隨風"},{"DATA":"/storage/emulated/0/Music/music/赤子.mp3","ARTIST":"葉德嫻","DURATION":219302,"ALBUM":"星之旅全經典集","TITLE":"赤子"},{"DATA":"/storage/emulated/0/Music/180bpm/跑步歌单 #1283 · 180 · 合集 · 纯音乐精选.mp3","ARTIST":"<unknown>","DURATION":1938564,"ALBUM":"180bpm","TITLE":"跑步歌单 #1283 · 180 · 合集 · 纯音乐精选"},{"DATA":"/storage/emulated/0/Music/180bpm/跑步歌单 #1343 · 180 · 合集 · 纯音乐精选.mp3","ARTIST":"<unknown>","DURATION":2703778,"ALBUM":"180bpm","TITLE":"跑步歌单 #1343 · 180 · 合集 · 纯音乐精选"},{"DATA":"/storage/emulated/0/Music/180bpm/跑步歌单 #1403 · 180 · 合集 · 纯音乐精选.mp3","ARTIST":"<unknown>","DURATION":2032048,"ALBUM":"180bpm","TITLE":"跑步歌单 #1403 · 180 · 合集 · 纯音乐精选"},{"DATA":"/storage/emulated/0/Music/music/邊界1999.mp3","ARTIST":"<unknown>","DURATION":281156,"ALBUM":"music","TITLE":"邊界1999"},{"DATA":"/storage/emulated/0/Music/music/铁窗.mp3","ARTIST":"许美静","DURATION":291139,"ALBUM":"Unknown Album","TITLE":"铁窗"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-长城.mp3","ARTIST":"陈嘉璐 - Topic","DURATION":272353,"ALBUM":"长城","TITLE":"长城"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-Amani.mp3","ARTIST":"<unknown>","DURATION":275357,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-Amani"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-不再犹豫.mp3","ARTIST":"<unknown>","DURATION":250149,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-不再犹豫"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-为了你为了我.mp3","ARTIST":"<unknown>","DURATION":246936,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-为了你为了我"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-俾面派对.mp3","ARTIST":"<unknown>","DURATION":169195,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-俾面派对"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-农民.mp3","ARTIST":"<unknown>","DURATION":253283,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-农民"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-午夜怨曲.mp3","ARTIST":"<unknown>","DURATION":233143,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-午夜怨曲"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-喜欢你.mp3","ARTIST":"<unknown>","DURATION":272823,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-喜欢你"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-岁月无声.mp3","ARTIST":"<unknown>","DURATION":189832,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-岁月无声"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-情人.mp3","ARTIST":"<unknown>","DURATION":261251,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-情人"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-无悔这一生.mp3","ARTIST":"<unknown>","DURATION":230975,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-无悔这一生"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-曾经拥有.mp3","ARTIST":"<unknown>","DURATION":237584,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-曾经拥有"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-海阔天空.mp3","ARTIST":"<unknown>","DURATION":287896,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-海阔天空"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-真的爱你.mp3","ARTIST":"<unknown>","DURATION":274390,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-真的爱你"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-谁伴我闯荡.mp3","ARTIST":"<unknown>","DURATION":227918,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-谁伴我闯荡"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-逝去日子.mp3","ARTIST":"<unknown>","DURATION":144953,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-逝去日子"},{"DATA":"/storage/emulated/0/Music/陈嘉璐-情人别安/陈嘉璐-遥望.mp3","ARTIST":"<unknown>","DURATION":328124,"ALBUM":"陈嘉璐-情人别安","TITLE":"陈嘉璐-遥望"},{"DATA":"/storage/emulated/0/Music/music/黃凱芹 - 漣漪.mp3","ARTIST":"<unknown>","DURATION":201587,"ALBUM":"music","TITLE":"黃凱芹 - 漣漪"},{"DATA":"/storage/emulated/0/Music/music/黃凱芹 - 那有一天不想你.mp3","ARTIST":"<unknown>","DURATION":263471,"ALBUM":"music","TITLE":"黃凱芹 - 那有一天不想你"},{"DATA":"/storage/emulated/0/Music/music/黃耀明-愈快樂愈墮落暗湧國語版.mp3","ARTIST":"<unknown>","DURATION":231105,"ALBUM":"music","TITLE":"黃耀明-愈快樂愈墮落暗湧國語版"},{"DATA":"/storage/emulated/0/Music/music/黃耀明-赤子.mp3","ARTIST":"<unknown>","DURATION":201509,"ALBUM":"music","TITLE":"黃耀明-赤子"},{"DATA":"/storage/emulated/0/Music/music/齐秦 - 痛并快乐着.mp3","ARTIST":"<unknown>","DURATION":279902,"ALBUM":"music","TITLE":"齐秦 - 痛并快乐着"},{"DATA":"/storage/emulated/0/Music/芝加哥蓝调/2025芝加哥藍調男聲精選.mp3","ARTIST":"小光音樂","DURATION":3691337,"ALBUM":"🌃 2025芝加哥藍調男聲精選｜下班後・放空・沉澱的療癒BGM 🎧｜小光音樂｜#芝加哥藍調  #放鬆音樂 #男聲 #獨處時光 #ChicagoBlues","TITLE":"🌃 2025芝加哥藍調男聲精選｜下班後・放空・沉澱的療癒BGM 🎧｜小光音樂｜#芝加哥藍調  #放鬆音樂 #男聲 #獨處時光 #ChicagoBlues"},{"DATA":"/storage/emulated/0/Music/芝加哥蓝调/2025芝加哥藍調深情男聲 深夜裡的煙燻嗓音.mp3","ARTIST":"小光音樂","DURATION":3691416,"ALBUM":"🎶【2025芝加哥藍調深情男聲】深夜裡的煙燻嗓音 🥃｜一杯敬孤獨的憂鬱旋律 🌃｜閱讀・思考・放鬆 BGM 🎧｜小光音樂｜#芝加哥藍調 #深情男聲 #深夜音樂 #放鬆BGM #ChicagoBlues","TITLE":"🎶【2025芝加哥藍調深情男聲】深夜裡的煙燻嗓音 🥃｜一杯敬孤獨的憂鬱旋律 🌃｜閱讀・思考・放鬆 BGM 🎧｜小光音樂｜#芝加哥藍調 #深情男聲 #深夜音樂 #放鬆BGM #ChicagoBlues"},{"DATA":"/storage/emulated/0/Music/芝加哥蓝调/2025芝加哥藍調男聲精選 深夜裡的靈魂獨白.mp3","ARTIST":"小光音樂","DURATION":3730834,"ALBUM":"🎶【2025芝加哥藍調男聲精選】深夜裡的靈魂獨白 🥃｜慵懶憂鬱的經典慢藍調｜適合獨處・閱讀・放鬆 BGM 🎧｜小光音樂｜#芝加哥藍調 #慢藍調 #男聲 #放鬆音樂 #深夜BGM #憂鬱歌單","TITLE":"🎶【2025芝加哥藍調男聲精選】深夜裡的靈魂獨白 🥃｜慵懶憂鬱的經典慢藍調｜適合獨處・閱讀・放鬆 BGM 🎧｜小光音樂｜#芝加哥藍調 #慢藍調 #男聲 #放鬆音樂 #深夜BGM #憂鬱歌單"},{"DATA":"/storage/emulated/0/Music/芝加哥蓝调/2025芝加哥藍調精 深夜城市的憂鬱獨白.mp3","ARTIST":"小光音樂","DURATION":3624072,"ALBUM":"🎶【2025芝加哥藍調精選】深夜城市的憂鬱獨白 🥃｜適合獨處・思考・放鬆的靈魂BGM 🎧｜小光音樂｜#芝加哥藍調 #深夜音樂 #男聲 #放鬆BGM #背景音樂 #ChicagoBlues","TITLE":"🎶【2025芝加哥藍調精選】深夜城市的憂鬱獨白 🥃｜適合獨處・思考・放鬆的靈魂BGM 🎧｜小光音樂｜#芝加哥藍調 #深夜音樂 #男聲 #放鬆BGM #背景音樂 #ChicagoBlues"},{"DATA":"/storage/emulated/0/Music/芝加哥蓝调/2025芝加哥藍調 男人的心事 滄桑嗓音裡的深情告白.mp3","ARTIST":"小光音樂","DURATION":3985789,"ALBUM":"💔【2025芝加哥藍調・男人的心事】滄桑嗓音裡的深情告白 🎙️｜聽懂的人都經歷過故事｜情感BGM 🎧｜小光音樂｜#芝加哥藍調 #滄桑男聲 #情感音樂 #心事 #藍調歌單 #ChicagoBlues","TITLE":"💔【2025芝加哥藍調・男人的心事】滄桑嗓音裡的深情告白 🎙️｜聽懂的人都經歷過故事｜情感BGM 🎧｜小光音樂｜#芝加哥藍調 #滄桑男聲 #情感音樂 #心事 #藍調歌單 #ChicagoBlues"},{"DATA":"/storage/emulated/0/Music/芝加哥蓝调/2025芝加哥藍調公路歌單 漫遊在午夜街頭的孤獨旋律.mp3","ARTIST":"小光音樂","DURATION":3900160,"ALBUM":"🚗 2025芝加哥藍調公路歌單｜漫遊在午夜街頭的孤獨旋律 🌃｜兜風・散步・沈澱的BGM 🎧｜小光音樂｜#芝加哥藍調 #公路音樂 #深夜兜風 #男聲 #放鬆BGM #ChicagoBlues","TITLE":"🚗 2025芝加哥藍調公路歌單｜漫遊在午夜街頭的孤獨旋律 🌃｜兜風・散步・沈澱的BGM 🎧｜小光音樂｜#芝加哥藍調 #公路音樂 #深夜兜風 #男聲 #放鬆BGM #ChicagoBlues"}]
    },

    formatDuration(durationMs) {
        const totalSeconds = Math.max(0, Math.floor((Number(durationMs) || 0) / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');

        if (hours > 0) {
            return `${hours}:${mm}:${ss}`;
        }
        return `${mm}:${ss}`;
    },

    updatePlayList(newPlaylist) {
        this.playList.list = newPlaylist;
        this.playList.currentIndex = 0;
        this.playList.errFileCount = 0;

        this.saveClientBuffer('playList', JSON.stringify(this.playList));
        DeviceEventEmitter.emit('cmd', {cmd:'playListUpdated',});
    },

    appendPlayList(list) {
        //this.playList.list = [...this.playList.list, ...list];
        for (const item of list) {
            if (!this.playList.list.some(existingItem => existingItem.DATA === item.DATA)) {
                this.playList.list.push(item);
            }
        }
        this.saveClientBuffer('playList', JSON.stringify(this.playList));
    },

    async playItem(item) {
        try {
            if (this.playingItem.item?.DATA === item.DATA) {
                if (this.playingItem.status === 'play') {
                    await NativeModules.AudioModule.pause();
                    this.playingItem.status = 'paused';
                } else if (this.playingItem.status === 'paused') {
                    await NativeModules.AudioModule.resume();
                    this.playingItem.status = 'play';
                }
                else {
                    if (item.err === true) {
                        return false;
                    }
                    else {
                        const result = await NativeModules.AudioModule.play(item.DATA);
                        if (result === true) {
                            this.playingItem.status = 'play';
                        } else {
                            item.err = true;
                            return false;
                        }
                    }
                }
                return true;
            }
            else {
                if (this.playingItem.item) {
                    await this.stopPlay();
                }
                this.playingItem.item = item;
                if (item.err === true) {
                    return false;
                }
                const result = await NativeModules.AudioModule.play(item.DATA);
                if (result === true) {
                    this.playingItem.status = 'play';
                } else {
                    item.err = true;
                    return false;
                }
            }
            
            
        } catch (error) {
            console.log('Failed to start music playback: ' + (error?.message || JSON.stringify(error)));
            return false;
        }
        return true
    },

    async stopPlay() {
        if (this.playingItem.status !== 'stop') {
            await NativeModules.AudioModule.stop();
            this.playingItem.status = 'stop';
        }
    },

    async pausePlay() {
        if (this.playingItem.status === 'play') {
            await NativeModules.AudioModule.pause();
            this.playingItem.status = 'paused';
        }
    },

    async resumePlay() {
        if (this.playingItem.status === 'paused') {
            await NativeModules.AudioModule.resume();
            this.playingItem.status = 'play';
        }
    },

};

export default global;
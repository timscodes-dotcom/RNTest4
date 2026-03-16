import React, { Component } from 'react';
import { View, TouchableOpacity, Text, NativeModules, Platform, FlatList, RefreshControl, ScrollView, TextInput, Switch, Image,
    DeviceEventEmitter, Keyboard, Alert, findNodeHandle } from 'react-native';
import PropTypes from 'prop-types';

import mobileAds, { BannerAd, BannerAdSize, TestIds, useForeground } from 'react-native-google-mobile-ads';
import settings, { googleAd } from './Settings';

import ScreenUtil from './ScreenUtil'; 
import global from './Global';

import MyBackHandler from './MyBackHandler';

import CheckBox from '@react-native-community/checkbox';

import ViewMusicList from './ViewMusicList';
import ViewPlayList from './ViewPlayList';
import ViewGroupMusicList from './ViewGroupMusicList';

import SvgList from './svg_component/List';
import SvgListMusic from './svg_component/ListMusic';
import SvgMusicPlay from './svg_component/MusicPlay';
import SvgMusicPause from './svg_component/MusicPause';
import SvgMusicStop from './svg_component/MusicStop';
import SvgMusicNext from './svg_component/MusicNext';
import SvgMusicPrev from './svg_component/MusicPrev';
import SvgPlayRandom from './svg_component/PlayRandom';
import SvgPlayRepeat from './svg_component/PlayRepeat';
import SvgPlayRepeatOne from './svg_component/PlayRepeatOne';
import SvgListDelete from './svg_component/ListDelete';
import SvgEdit from './svg_component/Edit';

class ViewMusic extends Component {
    
    static propTypes = {
        onCloseFunc: PropTypes.func.isRequired,
        test: PropTypes.string,
    }

    static defaultProps = {
        test: 'default'
    }

    constructor(props) {
        super(props);

        this.repeatModeList = ['shuffle', 'repeatAll', 'repeatOne'];

        const repeatModeStr = global.getClientBufferStr('repeatMode') || '0';
        const repeatMode = parseInt(repeatModeStr, 10) || 0;

        this.state = {
            folderList: [],
            groupList: global.groupList,
            musicList: {
                show: false,
                type: 'folder',
                info: null,
            },
            playList: {
                show: false,
            },

            playStatus: 'stop', // play, pause, stop

            repeatMode: repeatMode, // 0: shuffle, 1: repeatAll, 2: repeatOne

            currTITLE: '',
            currDURATION: '00:00/00:00',
        };

        this.playStartTime = 0;

        const playListStr = global.getClientBufferStr('playList');
        if (playListStr) {
            try {
                const playList = JSON.parse(playListStr);
                for (let i = playList.list.length - 1; i >= 0; i--) {
                    const item = playList.list[i];
                    item.err = false;
                }
                global.playList = playList;
                global.errFileCount = 0;
                this.state.currTITLE = playList.list[playList.currentIndex]?.TITLE || '';
                this.state.currDURATION = global.formatDuration(playList.list[playList.currentIndex]?.DURATION) || '00:00';
            } catch (error) {
                console.log('parse playList error: ' + (error?.message || JSON.stringify(error)));
            }
        }

        const groupListStr = global.getClientBufferStr('groupList');
        if (groupListStr) {
            try {
                this.state.groupList = JSON.parse(groupListStr);
                for (let i = 0; i < this.state.groupList.length; i++) {
                    const group = this.state.groupList[i];
                    group.status = '';
                }
                global.groupList = this.state.groupList;
            } catch (error) {
                console.log('parse groupList error: ' + (error?.message || JSON.stringify(error)));
            }
        }
    }

    readMusicList(list) {
        /*
        {
            "DATA":"/storage/emulated/0/Music/music/ 焦迈奇 x 蔡维泽  坚强的理由.mp3",
            "ARTIST":"<unknown>",
            "DURATION":250175,
            "ALBUM":"music",
            "TITLE":" 焦迈奇 x 蔡维泽  坚强的理由"
        }
        */
       const folderList = {};
       for (var i=0; i<list.length; i++) {
            const arr = list[i].DATA.split('/');
            const _idx = list[i].DATA.lastIndexOf('/');
            const _path = list[i].DATA.substring(0, _idx);
            const folderName = arr.length>2?arr[arr.length-2]:'/';
            if (folderList[_path]) {
                folderList[_path].list.push(list[i]);
            } else {
                folderList[_path] = {folderName: folderName, key: _path, list: [list[i]]};
            }
       }

       for (const [key, value] of Object.entries(folderList)) {
            this.state.folderList.push(value);
       }
       this.setState({ folderList: this.state.folderList });
    }

    async componentDidMount() {
        console.log('ViewMusic componentDidMount');
        try {
            const list = await global.getMusicFileList();
            console.log('music file list count: ' + list.length);
            //console.log('music file list: ' + JSON.stringify(list));
            if (list.length == 0) {
                const list1 = global.getTestList();
                console.log('test list count: ' + list1.length);
                this.readMusicList(list1);
            }
            else {
                this.readMusicList(list);
            }
        } catch (error) {
            console.log('get music file list error: ' + (error?.message || JSON.stringify(error)));
        }

        this.listenCmd = DeviceEventEmitter.addListener('cmd', e => {
            if (e.cmd == 'playComplete') {
                console.log('play complete: ' + JSON.stringify(e.msg));
                if (this.state.playStatus == 'play') {
                    this.playNext();
                }
            }
            else if (e.cmd == 'playStop') {
                console.log('play stop: ' + JSON.stringify(e.msg));
                this.setState({playStatus: 'stop'});
            }
            else if (e.cmd == 'playProgress') {
                //console.log('play progress: ' + JSON.stringify(e.msg));
                const current = e.msg.position;
                const duration = e.msg.duration;
                this.setState({currDURATION: global.formatDuration(current) + '/' + global.formatDuration(duration)});
            }
            else if (e.cmd == 'playErr') {
                this.playNext();
            }
            else if (e.cmd == 'groupListUpdated') {
                this.setState({groupList: global.groupList});
            }
        });
    }

    async playNext(action) { // action: start, prev
        if (global.playList.list.length == 0) {
            this.setState({playStatus: 'stop'});
            return false;
        }
        if (global.playList.list.length <= global.errFileCount) {
            this.setState({playStatus: 'stop'});
            return false;
        }

        global.playingItem.item = null;

        let nextIndex = 0;
        if (this.state.repeatMode == 0) {
            // shuffle
            nextIndex = Math.floor(Math.random() * global.playList.list.length);
        }
        else if (this.state.repeatMode == 1) {
            // repeat all
            if (action == 'start') {
                nextIndex = global.playList.currentIndex;
            }
            else if (action == 'prev') {
                nextIndex = global.playList.currentIndex - 1;
                if (nextIndex < 0) {
                    nextIndex = global.playList.list.length - 1;
                }
            }
            else {
                nextIndex = global.playList.currentIndex + 1;
                if (nextIndex >= global.playList.list.length) {
                    nextIndex = 0;
                }
            }
        }
        else if (this.state.repeatMode == 2) {
            // repeat one
            nextIndex = global.playList.currentIndex;
        }

        const item = global.playList.list[nextIndex];
        this.setState({currTITLE: item.TITLE, currDURATION: global.formatDuration(item.DURATION)});
        global.playList.currentIndex = nextIndex;
        global.saveClientBuffer('playList', JSON.stringify(global.playList));

        if (item.err === true) {
            DeviceEventEmitter.emit('cmd', {cmd:'playErr', msg:{}});
        }
        else {
            const result = await global.playItem(item);
            if (result == false) {
                item.err = true;
                global.errFileCount = (global.errFileCount || 0) + 1;
                DeviceEventEmitter.emit('cmd', {cmd:'playErr', msg:{}});
            }
        }
        
        return true;
    }

    componentWillUnmount() {
        if (this.listenCmd) {
            this.listenCmd.remove();
        }
    }

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: 'white', width: ScreenUtil.deviceWidth, height: ScreenUtil.flexHeight, flexDirection:'column' }}>
                <View style={{height:ScreenUtil.scaleHeight(20)}} />
                <View style={{width:'100%', flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                    <View style={{width:'90%', height:ScreenUtil.scaleHeight(40), flexDirection:'row',}}>
                        <View style={{width:ScreenUtil.scaleHeight(40), height:ScreenUtil.scaleHeight(40), justifyContent:'center', alignItems:'center',}}>
                            <Image resizeMode='stretch'  style={{height:ScreenUtil.scaleHeight(30), width:ScreenUtil.scaleHeight(30),}} 
                                source={require('./assets/playing.gif')}
                                />
                        </View>
                        <View style={{width:ScreenUtil.scaleWidth(10)}} />
                        <TouchableOpacity style={{height:ScreenUtil.scaleHeight(40), backgroundColor:this.state.musicList.type === 'folder' ? 'lightgray' : 'lightblue', 
                                borderRadius: ScreenUtil.scaleHeight(10), justifyContent:'center', alignItems:'center'}}
                                onPress={() => {
                                    if (this.state.musicList.type !== 'group') {
                                        this.state.musicList.type = 'group';
                                        this.setState({musicList: this.state.musicList});
                                    }
                                }}>
                            <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16), paddingLeft: ScreenUtil.scaleWidth(20), paddingRight: ScreenUtil.scaleWidth(20)}}>歌单</Text>
                        </TouchableOpacity>
                        <View style={{width:ScreenUtil.scaleWidth(10)}} />
                        <TouchableOpacity style={{height:ScreenUtil.scaleHeight(40), backgroundColor:this.state.musicList.type === 'folder' ? 'lightblue' : 'lightgray', 
                                borderRadius: ScreenUtil.scaleHeight(10), justifyContent:'center', alignItems:'center'}}
                                onPress={() => {
                                    if (this.state.musicList.type !== 'folder') {
                                        this.state.musicList.type = 'folder';
                                        this.setState({musicList: this.state.musicList});
                                    }
                                }}>
                            <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16), paddingLeft: ScreenUtil.scaleWidth(20), paddingRight: ScreenUtil.scaleWidth(20)}}>文件夹</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={{height:ScreenUtil.scaleHeight(15)}} />
                <View style={{width:'100%', height:ScreenUtil.flexHeight- ScreenUtil.scaleHeight(190), backgroundColor:'lightblue', flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                    <FlatList
                        style={{width:'100%'}}
                        data={this.state.musicList.type === 'folder' ? this.state.folderList : this.state.groupList}
                        renderItem={this._renderListItem} // 从数据源中挨个取出数据并渲染到列表中
                        //showsVerticalScrollIndicator={true} // 当此属性为true的时候，显示一个垂直方向的滚动条，默认为: true
                        showsHorizontalScrollIndicator={true} // 当此属性为true的时候，显示一个水平方向的滚动条，默认为: true
                        //initialScrollInde={3}
                        horizontal={false}
                        //ItemSeparatorComponent = {this._renderSeparator} // 行与行之间的分隔线组件。不会出现在第一行之前和最后一行之后
                        //ListEmptyComponent = {this._renderListEmptyComp} // 列表为空时渲染该组件。可以是 React Component, 也可以是一个 render 函数，或者渲染好的 element
                        //onEndReachedThreshold={0.01} // 决定当距离内容最底部还有多远时触发onEndReached回调，范围0~1，如0.01表示触底时触发
                        //onEndReached={this._onEndReached} // 在列表底部往下滑时触发该函数。表示当列表被滚动到距离内容最底部不足onEndReachedThreshold的距离时调用
                        //onViewableItemsChanged={this.onViewableItemsChanged}
                        //getItemLayout={(data,index)=>(
                        //    {length: ScreenUtil.scaleHeight(70), offset: (ScreenUtil.scaleHeight(70)) * index, index}
                        //)}
                        refreshControl={
                            <RefreshControl
                                refreshing={false} // 在等待加载新数据时将此属性设为 true，列表就会显示出一个正在加载的符号
                                //onRefresh={this._onListRefresh.bind(this)} // 在列表顶部往下滑时触发该函数。如果设置了此选项，则会在列表头部添加一个标准的RefreshControl控件，以便实现“下拉刷新”的功能
                                tintColor="#ffffff" // 指定刷新指示器的背景色(iOS)
                                //title={ScreenUtil.getTextValue('loading')+"..."} // 指定刷新指示器下显示的文字(iOS)
                                titleColor="#000000" // 指定刷新指示器下显示的文字的颜色(iOS)
                                colors={['#ff0000', '#00ff00', '#0000ff']} // 刷新指示器在刷新期间的过渡颜色(Android)
                                progressBackgroundColor="#ffffff" // 指定刷新指示器的背景色(Android)
                            />
                        }
                    />
                </View>
                <View style={{height:ScreenUtil.scaleHeight(10)}} />
                <View style={{width:'100%', flexDirection:'row', justifyContent:'center', alignItems:'center'}}
                    
                >
                    <View style={{width:'90%', height:ScreenUtil.scaleHeight(80), backgroundColor:'lightgray', borderRadius: ScreenUtil.scaleHeight(20), flexDirection:'column',}}>
                        <View style = {{width:'100%', height:ScreenUtil.scaleHeight(40), flexDirection:'row',}}>
                            <View style={{height:'100%', width:ScreenUtil.scaleWidth(180), backgroundColor:'transparent', flexDirection:'row',}}>
                                <View style={{height:'100%', flexDirection:'column', justifyContent:'center', alignItems:'center', paddingLeft: ScreenUtil.scaleWidth(20)}}>
                                    <Text
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        style={{color:'black', fontSize: ScreenUtil.scaleHeight(16), textAlign:'left'}}
                                    >
                                        {this.state.currTITLE}
                                    </Text>
                                </View>
                            </View>
                            <View style={{height:'100%', width:'100%', flexDirection:'row-reverse', position:'absolute', top:0, left:0, backgroundColor:'transparent',}}>
                                <View style={{width:ScreenUtil.scaleWidth(20),}} />
                                <View style={{height:'100%', flexDirection:'column', justifyContent:'center', alignItems:'center', }}>
                                <Text
                                        style={{color:'black', fontSize: ScreenUtil.scaleHeight(16), textAlign:'left'}}
                                    >
                                        {this.state.currDURATION}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style = {{width:'100%', height:ScreenUtil.scaleHeight(40), flexDirection:'row',justifyContent:'center', alignItems:'center'}}>
                            
                            <TouchableOpacity style={{width:ScreenUtil.scaleHeight(40), height:ScreenUtil.scaleHeight(40), flexDirection:'row', justifyContent:'center', alignItems:'center', backgroundColor:'transparent',}}
                                    onPress={() => {
                                            const nextMode = (this.state.repeatMode + 1) % this.repeatModeList.length;
                                            global.saveClientBuffer('repeatMode', nextMode.toString());
                                            this.setState({repeatMode: nextMode});
                                        }}>
                                <View style={{height:'100%', flexDirection:'column', justifyContent:'center', alignItems:'center',}} >
                                    {this.state.repeatMode == 0 && <SvgPlayRandom stroke={ScreenUtil.getTextColor('keyColor')} width={ScreenUtil.scaleHeight(40)*0.6} height={ScreenUtil.scaleHeight(40)*0.6} />}
                                    {this.state.repeatMode == 1 && <SvgPlayRepeat stroke={ScreenUtil.getTextColor('keyColor')} width={ScreenUtil.scaleHeight(40)*0.6} height={ScreenUtil.scaleHeight(40)*0.6} />}
                                    {this.state.repeatMode == 2 && <SvgPlayRepeatOne stroke={ScreenUtil.getTextColor('keyColor')} width={ScreenUtil.scaleHeight(40)*0.6} height={ScreenUtil.scaleHeight(40)*0.6} />}
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={{width:ScreenUtil.scaleHeight(40), height:ScreenUtil.scaleHeight(40), flexDirection:'row', justifyContent:'center', alignItems:'center', backgroundColor:'transparent',}}
                                    onPress={() => {
                                        this.playNext('prev');
                                        }}>
                                <View style={{height:'100%', flexDirection:'column', justifyContent:'center', alignItems:'center',}} >
                                    <SvgMusicPrev stroke={ScreenUtil.getTextColor('keyColor')} width={ScreenUtil.scaleHeight(40)*0.6} height={ScreenUtil.scaleHeight(40)*0.6} />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={{width:ScreenUtil.scaleHeight(40), height:ScreenUtil.scaleHeight(40), flexDirection:'row', justifyContent:'center', alignItems:'center', backgroundColor:'transparent',}}
                                    onPress={() => {
                                        if (this.state.playStatus == 'play') {
                                            global.pausePlay();
                                            this.setState({playStatus: 'pause'});
                                        } else if (this.state.playStatus == 'pause') {
                                            global.resumePlay();
                                            this.setState({playStatus: 'play'});
                                        }
                                        else {
                                            this.playNext('start');
                                            this.setState({playStatus: 'play'});
                                        }
                                        }}>
                                <View style={{height:'100%', flexDirection:'column', justifyContent:'center', alignItems:'center',}} >
                                    {this.state.playStatus == 'play' && <SvgMusicPause stroke={ScreenUtil.getTextColor('keyColor')} width={ScreenUtil.scaleHeight(40)*0.6} height={ScreenUtil.scaleHeight(40)*0.6} />}
                                    {this.state.playStatus != 'play' && <SvgMusicPlay stroke={ScreenUtil.getTextColor('keyColor')} width={ScreenUtil.scaleHeight(40)*0.6} height={ScreenUtil.scaleHeight(40)*0.6} />}
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={{width:ScreenUtil.scaleHeight(40), height:ScreenUtil.scaleHeight(40), flexDirection:'row', justifyContent:'center', alignItems:'center', backgroundColor:'transparent',}}
                                    onPress={() => {
                                        this.playNext('next');
                                        }}>
                                <View style={{height:'100%', flexDirection:'column', justifyContent:'center', alignItems:'center',}} >
                                    <SvgMusicNext stroke={ScreenUtil.getTextColor('keyColor')} width={ScreenUtil.scaleHeight(40)*0.6} height={ScreenUtil.scaleHeight(40)*0.6} />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={{width:ScreenUtil.scaleHeight(40), height:ScreenUtil.scaleHeight(40), flexDirection:'row', justifyContent:'center', alignItems:'center', backgroundColor:'transparent',}}
                                    onPress={() => {
                                            this.state.playList.show = true;
                                            this.setState({playList: this.state.playList});
                                        }}>
                                <View style={{height:'100%', flexDirection:'column', justifyContent:'center', alignItems:'center',}} >
                                    <SvgListMusic stroke={ScreenUtil.getTextColor('keyColor')} width={ScreenUtil.scaleHeight(40)*0.6} height={ScreenUtil.scaleHeight(40)*0.6} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                {this.state.musicList.show === true && this.state.musicList.type==='folder' && 
                <ViewMusicList info={this.state.musicList.info} onCloseFunc={() => {
                    this.state.musicList.show = false;
                    this.setState({musicList: this.state.musicList});
                }} />}
                {this.state.musicList.show === true && this.state.musicList.type==='group' && 
                <ViewGroupMusicList info={this.state.musicList.info} onCloseFunc={() => {
                    this.state.musicList.show = false;
                    this.setState({musicList: this.state.musicList});
                }} />}
                {this.state.playList.show === true && <ViewPlayList info={global.playList} onCloseFunc={() => {
                    this.state.playList.show = false;
                    this.setState({playList: this.state.playList});
                }} />}
            </View>
        );
    }

    _renderListItem = ({item, index}) => {
        if (this.state.musicList.type === 'group') {
            if (item.key === 'create') {
                return (
                    <View style={{width:'100%', height:ScreenUtil.scaleHeight(80), flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                        <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16)}}>{'新建: '}</Text>
                        <View style={{width:ScreenUtil.scaleWidth(10)}} />
                        <TextInput
                            style={{height: ScreenUtil.scaleHeight(40), width: ScreenUtil.scaleWidth(200), backgroundColor:'white', borderRadius: ScreenUtil.scaleHeight(10), paddingLeft: ScreenUtil.scaleWidth(10)}}
                            placeholder="输入歌单名称"
                            placeholderTextColor="gray"
                            color="black"
                            onChangeText={(text) => {
                                this.newGroupName = text;
                            }}
                        />
                        <View style={{width:ScreenUtil.scaleWidth(10)}} />
                        <TouchableOpacity style={{height:ScreenUtil.scaleHeight(40), backgroundColor:'lightgray', borderRadius: ScreenUtil.scaleHeight(10), justifyContent:'center', alignItems:'center', paddingLeft: ScreenUtil.scaleWidth(20), paddingRight: ScreenUtil.scaleWidth(20)}}
                            onPress={() => {
                                if (this.newGroupName == null || this.newGroupName.trim() == '') {
                                    Alert.alert('歌单名称不能为空');
                                    return;
                                }
                                const newGroup = {key: 'group_' + Date.now(), groupName: this.newGroupName || '新歌单', list: []};
                                this.state.groupList.push(newGroup);
                                this.setState({groupList: this.state.groupList});
                                global.groupList = this.state.groupList;
                                global.saveClientBuffer('groupList', JSON.stringify(this.state.groupList));
                            }}
                        >
                            <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16)}}>创建</Text>
                        </TouchableOpacity>
                    </View>
                )
            }

            if (item.status === 'edit') {
                return (
                    <View style={{width:'100%', height:ScreenUtil.scaleHeight(80), flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                        
                        <TextInput
                            style={{height: ScreenUtil.scaleHeight(40), width: ScreenUtil.scaleWidth(200), backgroundColor:'white', borderRadius: ScreenUtil.scaleHeight(10), paddingLeft: ScreenUtil.scaleWidth(10)}}
                            placeholder="请输入歌单名称"
                            placeholderTextColor="gray"
                            color="black"
                            value={item.groupName}
                            onChangeText={(text) => {
                                const groupList = [...this.state.groupList];
                                const index = groupList.findIndex(g => g.key === item.key);
                                if (index !== -1) {
                                    groupList[index].groupName = text;
                                    this.setState({groupList: groupList});
                                }
                            }}
                        />
                        <View style={{width:ScreenUtil.scaleWidth(10)}} />
                        <TouchableOpacity style={{height:ScreenUtil.scaleHeight(40), backgroundColor:'lightgray', borderRadius: ScreenUtil.scaleHeight(10), justifyContent:'center', alignItems:'center', paddingLeft: ScreenUtil.scaleWidth(10), paddingRight: ScreenUtil.scaleWidth(10)}}
                            onPress={() => {
                                const groupList = [...this.state.groupList];
                                const index = groupList.findIndex(g => g.key === item.key);
                                if (index !== -1) {
                                    groupList[index].status = '';
                                    this.setState({groupList: groupList});
                                    global.groupList = this.state.groupList;
                                    global.saveClientBuffer('groupList', JSON.stringify(groupList));
                                }
                            }}
                        >
                            <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16)}}>保存</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{height:ScreenUtil.scaleHeight(40), backgroundColor:'lightgray', borderRadius: ScreenUtil.scaleHeight(10), justifyContent:'center', alignItems:'center', paddingLeft: ScreenUtil.scaleWidth(10), paddingRight: ScreenUtil.scaleWidth(10), marginLeft: ScreenUtil.scaleWidth(10)}}
                            onPress={() => {
                                const groupList = [...this.state.groupList];
                                const index = groupList.findIndex(g => g.key === item.key);
                                if (index !== -1) {
                                    groupList[index].status = '';
                                    groupList[index].groupName = item.groupNameTemp || groupList[index].groupName;
                                    this.setState({groupList: groupList});
                                }
                            }}
                        >
                            <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16)}}>取消</Text>
                        </TouchableOpacity>
                    </View>
                )
            }
            return (
                <View style={{width:'100%', flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                    <View style={{width:'90%', height:ScreenUtil.scaleHeight(70), flexDirection:'row'}}>
                        <View style={{width:'100%', height:'100%', flexDirection:'row-reverse'}}>
                            <TouchableOpacity style={{height:'100%', width:ScreenUtil.scaleHeight(40), flexDirection:'row', justifyContent:'center', alignItems:'center',}}
                                onPress={() => {
                                    Alert.alert('删除歌单', '确定要删除歌单吗？', [
                                        {text: '取消', style: 'cancel'},
                                        {text: '确定', onPress: () => {
                                            const groupList = this.state.groupList.filter(g => g.key !== item.key);
                                            this.setState({groupList: groupList});
                                            global.saveClientBuffer('groupList', JSON.stringify(groupList));
                                            global.groupList = this.state.groupList;
                                        }},
                                    ]);
                                }}>
                                <View style={{height:'100%', flexDirection:'column', justifyContent:'center'}} >
                                    <SvgListDelete stroke={ScreenUtil.getTextColor('keyColor')} width={ScreenUtil.scaleHeight(40)*0.6} height={ScreenUtil.scaleHeight(40)*0.6} />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={{height:'100%', width:ScreenUtil.scaleHeight(40), flexDirection:'row', justifyContent:'center', alignItems:'center',}}
                                onPress={() => {
                                    item.status = 'edit';
                                    item.groupNameTemp = item.groupName;
                                    this.setState({groupList: this.state.groupList});
                                }}>
                                <View style={{height:'100%', flexDirection:'column', justifyContent:'center'}} >
                                    <SvgEdit stroke={ScreenUtil.getTextColor('keyColor')} width={ScreenUtil.scaleHeight(40)*0.6} height={ScreenUtil.scaleHeight(40)*0.6} />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={{height:'100%', width:ScreenUtil.scaleHeight(40), flexDirection:'row', justifyContent:'center', alignItems:'center',}}
                                onPress={() => {
                                }}>
                                <View style={{height:'100%', flexDirection:'column', justifyContent:'center'}} >
                                    <SvgMusicPlay stroke={ScreenUtil.getTextColor('keyColor')} width={ScreenUtil.scaleHeight(40)*0.6} height={ScreenUtil.scaleHeight(40)*0.6} />
                                </View>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={{height:'100%', flexDirection:'column', position:'absolute', top:0, left:0, paddingTop: ScreenUtil.scaleHeight(15)}}
                            onPress={async () => {
                                this.state.musicList.show = true;
                                this.state.musicList.type = 'group';
                                this.state.musicList.info = item;
                                this.setState({musicList: this.state.musicList});
                                }}
                            >
                            <View style={{width:'100%', flexDirection:'row'}}>
                                <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16)}}>
                                    {item.groupName} ({item.list.length})
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }
        return (
            <TouchableOpacity style={{width:'100%', flexDirection:'row', justifyContent:'center', alignItems:'center'}}
                onPress={() => {
                    this.state.musicList.show = true;
                    this.state.musicList.type = 'folder';
                    this.state.musicList.info = item;
                    this.setState({musicList: this.state.musicList});
                }}
            >
                <View style={{width:'90%', height:ScreenUtil.scaleHeight(70), flexDirection:'column', alignItems:'center', paddingTop: ScreenUtil.scaleHeight(15)}}>
                    <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16)}}>
                        {item.folderName} ({item.list.length})
                    </Text>
                    <Text style={{color:'gray', fontSize: ScreenUtil.scaleHeight(12)}}>{item.key}</Text>
                </View>
            </TouchableOpacity>
        );
    }

}

export default ViewMusic;

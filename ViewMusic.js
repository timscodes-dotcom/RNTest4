import React, { Component } from 'react';
import { View, TouchableOpacity, Text, NativeModules, Platform, FlatList, RefreshControl, ScrollView, TextInput, Switch, 
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

        this.state = {
            folderList: [],
            musicList: {
                show: false,
                type: 'folder',
                info: null,
            },
            playList: {
                show: false,
                info: null,
            },
        };
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
            console.log('music file list: ' + JSON.stringify(list));
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
    }

    componentWillUnmount() {
    }

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
    }

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: 'white', width: ScreenUtil.deviceWidth, height: ScreenUtil.flexHeight, flexDirection:'column' }}>
                <View style={{height:ScreenUtil.scaleHeight(20)}} />
                <View style={{width:'100%', flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                    <View style={{width:'90%', height:ScreenUtil.scaleHeight(40), flexDirection:'row',}}>
                        <View style={{width:ScreenUtil.scaleHeight(40), height:ScreenUtil.scaleHeight(40), justifyContent:'center', alignItems:'center', backgroundColor:'red',}}>
                        </View>
                        <View style={{width:ScreenUtil.scaleWidth(10)}} />
                        <View style={{height:ScreenUtil.scaleHeight(40), backgroundColor:'lightgray', borderRadius: ScreenUtil.scaleHeight(10), justifyContent:'center', alignItems:'center'}}>
                            <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16), paddingLeft: ScreenUtil.scaleWidth(20), paddingRight: ScreenUtil.scaleWidth(20)}}>歌单</Text>
                        </View>
                        <View style={{width:ScreenUtil.scaleWidth(10)}} />
                        <View style={{height:ScreenUtil.scaleHeight(40), backgroundColor:'lightgray', borderRadius: ScreenUtil.scaleHeight(10), justifyContent:'center', alignItems:'center'}}>
                            <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16), paddingLeft: ScreenUtil.scaleWidth(20), paddingRight: ScreenUtil.scaleWidth(20)}}>文件夹</Text>
                        </View>
                    </View>
                </View>
                <View style={{height:ScreenUtil.scaleHeight(15)}} />
                <View style={{width:'100%', height:ScreenUtil.flexHeight- ScreenUtil.scaleHeight(150), backgroundColor:'lightblue', flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                    <FlatList
                        style={{width:'100%'}}
                        data={this.state.folderList}
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
                <View style={{height:ScreenUtil.scaleHeight(5)}} />
                <TouchableOpacity style={{width:'100%', flexDirection:'row', justifyContent:'center', alignItems:'center'}}
                    onPress={() => {
                        this.state.playList.show = true;
                        this.setState({playList: this.state.playList});
                    }}
                >
                    <View style={{width:'90%', height:ScreenUtil.scaleHeight(40), backgroundColor:'lightgray', borderRadius: ScreenUtil.scaleHeight(20), justifyContent:'center', alignItems:'center'}}>
                        <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16)}}>Music List</Text>
                    </View>
                </TouchableOpacity>
                {this.state.musicList.show === true && <ViewMusicList info={this.state.musicList.info} onCloseFunc={() => {
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
                    <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16)}}>{item.folderName} ({item.list.length})</Text>
                    <Text style={{color:'gray', fontSize: ScreenUtil.scaleHeight(12)}}>{item.key}</Text>
                </View>
            </TouchableOpacity>
        );
    }

}

export default ViewMusic;

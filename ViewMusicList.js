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

class ViewMusicList extends Component {
    
    static propTypes = {
        onCloseFunc: PropTypes.func.isRequired,
        type: PropTypes.string, 
        info: PropTypes.object,
    }

    static defaultProps = {
        type: 'folder'
    }

    constructor(props) {
        super(props);

        this.state = {
            selectAll: true,
            list: [],
            playingItem: {
                item: null,
                err: false,
            }
        };

        for (let i=0; i<props.info.list.length; i++) {
            this.state.list.push(
                props.info.list[i]
            );
        }
        for (let i=0; i<this.state.list.length; i++) {
            this.state.list[i].selected = true;
        }
    }

    componentDidMount() {
        this.listListener = DeviceEventEmitter.addListener('cmd', (e) => {
            if (e.cmd === 'playComplete') {
                this.setState({
                    playingItem: {
                        item: null,
                        err: false,
                    }
                })
            }
        });
    }

    componentWillUnmount() {
        if (this.listListener) {
            this.listListener.remove();
        }
        if (this.played === true) {
            global.stopPlay();
        }
    }

    render() {
        return (
            <View style={{ backgroundColor: 'white', width: ScreenUtil.deviceWidth, height: ScreenUtil.flexHeight, flexDirection:'column', position:'absolute', top:0, left:0, zIndex:999 }}>
                <MyBackHandler hardwareBackPress={(e) => {
                    if (this.props.onCloseFunc) {
                        this.props.onCloseFunc();
                    }
                    return true;
                }}/>
                <View style={{height:ScreenUtil.scaleHeight(20)}} />
                <View style={{width:'100%', flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                    <TouchableOpacity style = {{width:'100%', flexDirection:'row', justifyContent:'center', height:ScreenUtil.scaleHeight(50), alignItems:'center',}}
                        onPress={() => {
                            if (this.props.onCloseFunc) {
                                this.props.onCloseFunc();
                            }
                        }}
                    >
                        <View style={{width:'70%', height:ScreenUtil.scaleHeight(50), flexDirection:'column',}}>
                            <View style={{width:'100%', height:ScreenUtil.scaleHeight(50), backgroundColor:'lightgray', borderRadius: ScreenUtil.scaleHeight(20), justifyContent:'center', alignItems:'center'}}>
                                <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16), lineHeight: ScreenUtil.scaleLineHeight(18)}}>{this.props.info.folderName+'('+this.state.list.length+')'} </Text>
                                <Text style={{color:'gray', fontSize: ScreenUtil.scaleHeight(12), lineHeight: ScreenUtil.scaleLineHeight(14)}} > {this.props.info.key}</Text>
                            </View>
                        </View>
                        <View style={{height:'100%', position:'absolute', top:0, left:0,justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <Text style={{color:'black', fontWeight:'bold', fontSize: ScreenUtil.scaleHeight(20), paddingLeft: ScreenUtil.scaleWidth(20)}}>{'≪'} </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={{height:ScreenUtil.scaleHeight(15)}} />

                <View style={{width:'100%', flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                    <View style={{width:'90%', height:ScreenUtil.scaleHeight(40),  justifyContent:'center', alignItems:'center'}}>
                        <View style={{width:'100%', flexDirection:'row-reverse'}}>
                            <CheckBox
                                disabled={false}
                                value={this.state.selectAll}
                                onValueChange={(newValue) => {
                                    const newList = [...this.state.list];
                                    for (let i = 0; i < newList.length; i++) {
                                        newList[i].selected = newValue;
                                    }
                                    this.setState({ list: newList, selectAll: newValue });
                                }}
                            />
                            <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16)}}>全选</Text>
                        </View>
                        <View style={{width:'100%', height:'100%', flexDirection:'row', position:'absolute', top:0, left:0}}>
                            <TouchableOpacity style={{height:'100%', justifyContent:'center', alignItems:'center', backgroundColor:'lightgray', paddingLeft: ScreenUtil.scaleWidth(20), paddingRight: ScreenUtil.scaleWidth(20), borderRadius: ScreenUtil.scaleHeight(10)}}
                                    onPress={() => {
                                        const selectedList = this.state.list.filter(item => item.selected);
                                        if (selectedList.length === 0) {
                                            Alert.alert('Info', '请至少选择一首歌曲');
                                            return;
                                        }
                                        global.updatePlayList(selectedList);
                                        if (this.props.onCloseFunc) {
                                            this.props.onCloseFunc();
                                        }
                                    }}
                                >
                                <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16)}}>播放</Text>
                            </TouchableOpacity>
                            <View style={{width:ScreenUtil.scaleWidth(10)}} />
                            <TouchableOpacity style={{height:'100%', justifyContent:'center', alignItems:'center', backgroundColor:'lightgray', paddingLeft: ScreenUtil.scaleWidth(20), paddingRight: ScreenUtil.scaleWidth(20), borderRadius: ScreenUtil.scaleHeight(10)}}
                                    onPress={() => {
                                        const selectedList = this.state.list.filter(item => item.selected);
                                        if (selectedList.length === 0) {
                                            Alert.alert('Info', '请至少选择一首歌曲');
                                            return;
                                        }
                                        global.appendPlayList(selectedList);
                                        if (this.props.onCloseFunc) {
                                            this.props.onCloseFunc();
                                        }
                                    }}
                                >
                                <Text style={{color:'black', fontSize: ScreenUtil.scaleHeight(16)}}>加入播放列表</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={{height:ScreenUtil.scaleHeight(5)}} />

                <View style={{width:'100%', height:ScreenUtil.flexHeight- ScreenUtil.scaleHeight(130), backgroundColor:'lightblue', flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                    <FlatList
                        style={{width:'100%'}}
                        data={this.state.list}
                        renderItem={this._renderListItemMusic} // 从数据源中挨个取出数据并渲染到列表中
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
            </View>
        );
    }

    _renderListItemMusic = ({item, index}) => {
        /*
        {
            "DATA":"/storage/emulated/0/Music/music/ 焦迈奇 x 蔡维泽  坚强的理由.mp3",
            "ARTIST":"<unknown>",
            "DURATION":250175,
            "ALBUM":"music",
            "TITLE":" 焦迈奇 x 蔡维泽  坚强的理由"
        }
        */
        return (
            <View style={{width:'100%', flexDirection:'row', justifyContent:'center', alignItems:'center'}}
                
            >
                <View style={{width:'90%', height:ScreenUtil.scaleHeight(70), flexDirection:'row'}}>
                    <View style={{width:'100%', height:'100%', flexDirection:'row-reverse'}}>
                        <View style={{height:'100%', flexDirection:'column', justifyContent:'center', alignItems:'center',}}>
                        <CheckBox
                            disabled={false}
                            value={item.selected}
                            onValueChange={(newValue) => {
                                const newList = [...this.state.list];
                                newList[index].selected = newValue;
                                if (newValue === false) {
                                    this.setState({ list: newList, selectAll: false });
                                }
                                else {
                                    this.setState({ list: newList });
                                }
                                
                            }}
                        />
                        </View>
                    </View>
                    <TouchableOpacity style={{height:'100%', width:'75%', flexDirection:'column', position:'absolute', top:0, left:0, paddingTop: ScreenUtil.scaleHeight(15)}}
                       onPress={async () => {
                            try {
                                global.hasPermission = await global.requestAndroidAudioPermission();
                                if (!global.hasPermission) {
                                    Alert.alert('Permission', '未获得读取音频权限');
                                    return;
                                }
/*
                                if (this.playingItem && this.playingItem.DATA === item.DATA) {
                                    await global.stopPlay();
                                    this.playingItem = null;
                                    return;
                                }
                                

                                if (global.playing == true) {
                                    NativeModules.AudioModule.stop();
                                    global.playing = false;
                                    return;
                                }

                                console.log('Playing music file: ' + item.DATA);
                                NativeModules.AudioModule.play('file://' + item.DATA).then(() => {
                                    console.log('Music playback started successfully');
                                    global.playing = true;
                                }).catch((error) => {
                                    console.log('Failed to start music playback: ' + (error?.message || JSON.stringify(error)));
                                });
                                */
                               //console.log(global.playingItem);
                               //console.log('### ');
                                this.playingItem = item;
                                const result = await global.playItem(item);
                                if (result == false) {
                                    Alert.alert('Error', 'Failed to play music!');
                                    item.err = true;
                                    this.setState({
                                        playingItem: {
                                            item: item,
                                            err: true,
                                        }
                                    })
                                }
                                else {
                                    this.played = true;
                                    this.setState({
                                        playingItem: {
                                            item: item,
                                            err: false,
                                        }
                                    })
                                }
                            } catch (error) {
                                Alert.alert('Error', 'Failed to play music: ' + (error?.message || JSON.stringify(error)));
                            }
                        }}
                    >
                    <View style={{width:'100%', flexDirection:'row'}}>
                        <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={{
                                color: this.getTitleColor(item), 
                                fontSize: ScreenUtil.scaleHeight(16), width:'100%', textAlign:'left'}}
                        >
                            {item.TITLE}
                        </Text>
                    </View>
                    <View style={{width:'100%', flexDirection:'row'}}>
                        <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={{color:'gray', fontSize: ScreenUtil.scaleHeight(12), width:'100%', textAlign:'left'}}
                        >
                            Artist: {item.ARTIST}, Album: {item.ALBUM}, Duration: {global.formatDuration(item.DURATION)}
                        </Text>
                    </View>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    getTitleColor(item) {
        if (item.err === true) {
            return 'red';
        }
        if (this.state.playingItem.item && this.state.playingItem.item.DATA === item.DATA) {
            if (this.state.playingItem.err === true) {
                return 'red';
            }
            else {
                return 'blue';
            }
        }
        return 'black';
    }
}

export default ViewMusicList;
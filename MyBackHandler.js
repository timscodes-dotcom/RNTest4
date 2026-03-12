import React, { Component } from 'react';
import { View, BackHandler, Platform} from 'react-native';
import PropTypes from 'prop-types';


class MyBackHandler extends Component {
    
    static propTypes = {
        hardwareBackPress: PropTypes.func.isRequired,
    }

    static defaultProps = {
    }

    constructor(props) {
        super(props);
  
        this.state = {
        };

        this._hardwareBackPress=this._hardwareBackPress.bind(this);
        this.subscription = null;
    }

    componentDidMount(){
        if(Platform.OS === "android") {
            this.subscription =BackHandler.addEventListener('hardwareBackPress', this._hardwareBackPress);
        }
    }

    componentWillUnmount() {
        if(Platform.OS === "android") {
            //if (this.backHandler) this.backHandler.remove();
            //BackHandler.removeEventListener('hardwareBackPress', this._hardwareBackPress)
            if (this.subscription) this.subscription.remove();
        }
    }

    _hardwareBackPress(e) {
        /*
        if (!this.state.show) return false;
                    this.setState({show:false, left:ScreenUtil.deviceWidth})
                    return true;
        */
        return this.props.hardwareBackPress(e);
    }

    render() {
        return ( <View style={{display:'none'}} />);
    }
}

export default MyBackHandler;
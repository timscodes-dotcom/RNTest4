import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
const SvgListAdd = props => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 48 48"
    {...props}
  >
    <Path
      stroke="#d0021b"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={4}
      d="M8 28h16M8 37h16M8 19h32M8 10h32M30 33h10M35 28v10"
    />
  </Svg>
);
export default SvgListAdd;

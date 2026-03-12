import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
const SvgListDelete = props => (
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
      d="M8 28h16M8 37h16M8 19h32M8 10h32M30 28l10 10M40 28 30 38"
    />
  </Svg>
);
export default SvgListDelete;

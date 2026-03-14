import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
const SvgClose = props => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    aria-hidden="true"
    className="close_svg__w-6 close_svg__h-6 close_svg__text-gray-800 close_svg__dark:text-white"
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18 17.94 6M18 18 6.06 6"
    />
  </Svg>
);
export default SvgClose;

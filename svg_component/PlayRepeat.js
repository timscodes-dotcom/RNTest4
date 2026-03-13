import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
const SvgPlayRepeat = props => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    aria-hidden="true"
    className="play_repeat_svg__w-6 play_repeat_svg__h-6 play_repeat_svg__text-gray-800 play_repeat_svg__dark:text-white"
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="m16 10 3-3m0 0-3-3m3 3H5v3m3 4-3 3m0 0 3 3m-3-3h14v-3"
    />
  </Svg>
);
export default SvgPlayRepeat;

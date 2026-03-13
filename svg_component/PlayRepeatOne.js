import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
const SvgPlayRepeatOne = props => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    aria-hidden="true"
    className="play_repeat_one_svg__w-6 play_repeat_one_svg__h-6 play_repeat_one_svg__text-gray-800 play_repeat_one_svg__dark:text-white"
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="m16 4 3 3H5v3m3 10-3-3h14v-3m-9-2.5 2-1.5v4"
    />
  </Svg>
);
export default SvgPlayRepeatOne;

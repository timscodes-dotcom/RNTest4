import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
const SvgPlayRandom = props => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    aria-hidden="true"
    className="play_random_svg__w-6 play_random_svg__h-6 play_random_svg__text-gray-800 play_random_svg__dark:text-white"
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13.484 9.166 15 7h5m0 0-3-3m3 3-3 3M4 17h4l1.577-2.253M4 7h4l7 10h5m0 0-3 3m3-3-3-3"
    />
  </Svg>
);
export default SvgPlayRandom;

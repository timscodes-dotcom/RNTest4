import * as React from 'react';
import Svg, { Rect } from 'react-native-svg';
const SvgMusicStop = props => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    aria-hidden="true"
    className="music_stop_svg__w-6 music_stop_svg__h-6 music_stop_svg__text-gray-800 music_stop_svg__dark:text-white"
    {...props}
  >
    <Rect
      width={12}
      height={12}
      x={6}
      y={6}
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth={2}
      rx={1}
    />
  </Svg>
);
export default SvgMusicStop;

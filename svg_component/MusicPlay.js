import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
const SvgMusicPlay = props => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    aria-hidden="true"
    className="music_play_svg__w-6 music_play_svg__h-6 music_play_svg__text-gray-800 music_play_svg__dark:text-white"
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 18V6l8 6z"
    />
  </Svg>
);
export default SvgMusicPlay;

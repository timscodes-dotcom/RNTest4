import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
const SvgMusicPrev = props => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    aria-hidden="true"
    className="music_prev_svg__w-6 music_prev_svg__h-6 music_prev_svg__text-gray-800 music_prev_svg__dark:text-white"
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 6v12m8-12v12l-8-6z"
    />
  </Svg>
);
export default SvgMusicPrev;

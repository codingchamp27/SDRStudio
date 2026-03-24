# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file LICENSE.rst or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION ${CMAKE_VERSION}) # this file comes with cmake

# If CMAKE_DISABLE_SOURCE_CHANGES is set to true and the source directory is an
# existing directory in our source tree, calling file(MAKE_DIRECTORY) on it
# would cause a fatal error, even though it would be a no-op.
if(NOT EXISTS "/Users/harshkumar/Desktop/sdrangel/build/external/zlib/src/zlib")
  file(MAKE_DIRECTORY "/Users/harshkumar/Desktop/sdrangel/build/external/zlib/src/zlib")
endif()
file(MAKE_DIRECTORY
  "/Users/harshkumar/Desktop/sdrangel/build/external/zlib/src/zlib-build"
  "/Users/harshkumar/Desktop/sdrangel/build/external/zlib"
  "/Users/harshkumar/Desktop/sdrangel/build/external/zlib/tmp"
  "/Users/harshkumar/Desktop/sdrangel/build/external/zlib/src/zlib-stamp"
  "/Users/harshkumar/Desktop/sdrangel/build/external/zlib/src"
  "/Users/harshkumar/Desktop/sdrangel/build/external/zlib/src/zlib-stamp"
)

set(configSubDirs )
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "/Users/harshkumar/Desktop/sdrangel/build/external/zlib/src/zlib-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "/Users/harshkumar/Desktop/sdrangel/build/external/zlib/src/zlib-stamp${cfgdir}") # cfgdir has leading slash
endif()
